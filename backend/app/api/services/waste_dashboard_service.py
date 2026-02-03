"""
Waste Dashboard Service

Business logic for Waste Management Team dashboard.
Manages waste status tracking and collection tasks.
"""

from datetime import datetime
from typing import Optional
from collections import OrderedDict
import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup
from app.core.event_bus import emit_event, EventType
from app.api.schemas.waste_dashboard import (
    AlertLevel,
    TaskStatus,
    HospitalWasteStatus,
    WasteDashboard,
    WasteTask,
    WasteTaskList,
    TaskCompleteResponse,
)


# In-memory waste tracking (would be persisted in production)
# hospital_id -> cumulative waste kg
_waste_levels: dict[int, float] = {}

# In-memory task store
# task_id -> task data
_waste_tasks: OrderedDict[str, dict] = OrderedDict()

# Thresholds
WARNING_THRESHOLD_KG = 100.0
CRITICAL_THRESHOLD_KG = 200.0

# Waste rate per occupied bed (kg per calculation)
WASTE_RATE_PER_BED = 1.5


def update_waste_level(hospital_id: int, added_kg: float) -> None:
    """Update waste level for a hospital (called from simulation)."""
    current = _waste_levels.get(hospital_id, 0.0)
    _waste_levels[hospital_id] = current + added_kg
    
    # Auto-create task if threshold crossed
    new_level = _waste_levels[hospital_id]
    if new_level >= WARNING_THRESHOLD_KG:
        _ensure_task_exists(hospital_id, new_level)


def reset_waste_level(hospital_id: int) -> float:
    """Reset waste level after collection. Returns collected amount."""
    collected = _waste_levels.get(hospital_id, 0.0)
    _waste_levels[hospital_id] = 0.0
    return collected


def _ensure_task_exists(hospital_id: int, waste_kg: float) -> None:
    """Ensure a pending task exists for this hospital."""
    # Check if pending task already exists
    for task in _waste_tasks.values():
        if task["hospital_id"] == hospital_id and task["status"] == TaskStatus.PENDING:
            # Update waste level on existing task
            task["waste_kg"] = waste_kg
            task["alert_level"] = _get_alert_level(waste_kg)
            task["priority"] = _get_priority(waste_kg)
            return
    
    # Create new task
    task_id = f"WT-{hospital_id}-{uuid.uuid4().hex[:8]}"
    _waste_tasks[task_id] = {
        "task_id": task_id,
        "hospital_id": hospital_id,
        "waste_kg": waste_kg,
        "alert_level": _get_alert_level(waste_kg),
        "status": TaskStatus.PENDING,
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "priority": _get_priority(waste_kg),
    }


def _get_alert_level(waste_kg: float) -> AlertLevel:
    """Determine alert level from waste amount."""
    if waste_kg >= CRITICAL_THRESHOLD_KG:
        return AlertLevel.CRITICAL
    elif waste_kg >= WARNING_THRESHOLD_KG:
        return AlertLevel.WARNING
    return AlertLevel.NORMAL


def _get_priority(waste_kg: float) -> int:
    """Determine priority from waste amount (1=highest)."""
    if waste_kg >= CRITICAL_THRESHOLD_KG:
        return 1
    elif waste_kg >= WARNING_THRESHOLD_KG:
        return 2
    return 3


class WasteDashboardService:
    """Service for Waste Management Team dashboard."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_dashboard(self) -> WasteDashboard:
        """Get complete waste dashboard."""
        
        # Get all active hospitals
        result = await self._session.execute(
            select(Hospital).where(Hospital.status == HospitalStatus.ACTIVE)
        )
        hospitals = result.scalars().all()
        
        hospital_statuses = []
        normal_count = 0
        warning_count = 0
        critical_count = 0
        total_pending = 0.0
        
        for hospital in hospitals:
            status = await self._get_hospital_waste_status(hospital)
            hospital_statuses.append(status)
            
            if status.alert_level == AlertLevel.CRITICAL:
                critical_count += 1
            elif status.alert_level == AlertLevel.WARNING:
                warning_count += 1
            else:
                normal_count += 1
            
            if status.pending_collection:
                total_pending += status.current_waste_kg
        
        # Sort by alert level (critical first)
        hospital_statuses.sort(
            key=lambda h: (
                0 if h.alert_level == AlertLevel.CRITICAL else
                1 if h.alert_level == AlertLevel.WARNING else 2,
                -h.current_waste_kg
            )
        )
        
        return WasteDashboard(
            total_hospitals=len(hospitals),
            hospitals_normal=normal_count,
            hospitals_warning=warning_count,
            hospitals_critical=critical_count,
            total_pending_kg=round(total_pending, 2),
            hospitals=hospital_statuses,
        )

    async def get_tasks(
        self,
        status_filter: Optional[TaskStatus] = None,
        hospital_id: Optional[int] = None,
    ) -> WasteTaskList:
        """Get waste collection tasks."""
        
        # Get hospital names
        hospital_names = await self._get_hospital_names()
        
        tasks = []
        pending_count = 0
        completed_today = 0
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        for task_data in _waste_tasks.values():
            # Apply filters
            if status_filter and task_data["status"] != status_filter:
                continue
            if hospital_id and task_data["hospital_id"] != hospital_id:
                continue
            
            hospital_info = hospital_names.get(task_data["hospital_id"], {})
            
            task = WasteTask(
                task_id=task_data["task_id"],
                hospital_id=task_data["hospital_id"],
                hospital_name=hospital_info.get("name", "Unknown"),
                city=hospital_info.get("city", "Unknown"),
                waste_kg=round(task_data["waste_kg"], 2),
                alert_level=task_data["alert_level"],
                status=task_data["status"],
                created_at=task_data["created_at"],
                completed_at=task_data["completed_at"],
                priority=task_data["priority"],
            )
            tasks.append(task)
            
            if task_data["status"] == TaskStatus.PENDING:
                pending_count += 1
            elif (
                task_data["status"] == TaskStatus.COMPLETED
                and task_data["completed_at"]
                and task_data["completed_at"] >= today_start
            ):
                completed_today += 1
        
        # Sort by priority then created_at
        tasks.sort(key=lambda t: (t.priority, t.created_at))
        
        return WasteTaskList(
            items=tasks,
            total=len(tasks),
            pending_count=pending_count,
            completed_today=completed_today,
        )

    async def complete_task(
        self,
        task_id: str,
        collected_kg: Optional[float] = None,
    ) -> TaskCompleteResponse:
        """Complete a waste collection task."""
        
        if task_id not in _waste_tasks:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found",
            )
        
        task = _waste_tasks[task_id]
        
        if task["status"] == TaskStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Task {task_id} is already completed",
            )
        
        hospital_id = task["hospital_id"]
        
        # Reset waste level and get actual collected amount
        actual_collected = reset_waste_level(hospital_id)
        if collected_kg is not None:
            actual_collected = collected_kg
        
        # Update task
        now = datetime.utcnow()
        task["status"] = TaskStatus.COMPLETED
        task["completed_at"] = now
        task["waste_kg"] = actual_collected
        
        # Emit event
        emit_event(EventType.WASTE_COLLECTED, {
            "task_id": task_id,
            "hospital_id": hospital_id,
            "collected_kg": round(actual_collected, 2),
            "completed_at": now.isoformat(),
        })
        
        return TaskCompleteResponse(
            task_id=task_id,
            hospital_id=hospital_id,
            status=TaskStatus.COMPLETED,
            collected_kg=round(actual_collected, 2),
            completed_at=now,
            message=f"Collected {actual_collected:.1f}kg of waste from hospital {hospital_id}",
        )

    async def _get_hospital_waste_status(
        self, hospital: Hospital
    ) -> HospitalWasteStatus:
        """Get waste status for a hospital."""
        
        # Get occupied beds
        result = await self._session.execute(
            select(func.coalesce(func.sum(BedGroup.occupied), 0)).where(
                BedGroup.hospital_id == hospital.id
            )
        )
        occupied_beds = int(result.scalar_one())
        
        # Get or estimate waste level
        waste_kg = _waste_levels.get(hospital.id, 0.0)
        if waste_kg == 0.0 and occupied_beds > 0:
            # Estimate based on occupancy
            waste_kg = occupied_beds * WASTE_RATE_PER_BED
            _waste_levels[hospital.id] = waste_kg
        
        alert_level = _get_alert_level(waste_kg)
        pending = waste_kg >= WARNING_THRESHOLD_KG
        
        return HospitalWasteStatus(
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            city=hospital.city,
            current_waste_kg=round(waste_kg, 2),
            threshold_warning_kg=WARNING_THRESHOLD_KG,
            threshold_critical_kg=CRITICAL_THRESHOLD_KG,
            alert_level=alert_level,
            pending_collection=pending,
            last_collection=None,
            occupied_beds=occupied_beds,
        )

    async def _get_hospital_names(self) -> dict[int, dict]:
        """Get hospital names and cities."""
        result = await self._session.execute(select(Hospital))
        hospitals = result.scalars().all()
        return {
            h.id: {"name": h.name, "city": h.city}
            for h in hospitals
        }
