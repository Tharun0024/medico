"""
Hospital Dashboard Service

Aggregation logic for Hospital Admin dashboard views.
"""

from datetime import datetime
from typing import Optional
from collections import deque

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.hospitals.models import Hospital
from app.modules.beds.models import BedGroup, WardType
from app.modules.emergencies.models import EmergencyCase, EmergencyStatus
from app.api.schemas.hospital_dashboard import (
    HospitalDashboard,
    WardUtilization,
    WasteStatus,
    RecentEvent,
)


# In-memory event store for recent events (per hospital)
# In production, this would be persisted
_hospital_events: dict[int, deque] = {}
MAX_RECENT_EVENTS = 20


def record_hospital_event(hospital_id: int, event_type: str, summary: str) -> None:
    """Record an event for a hospital (called from event handlers)."""
    if hospital_id not in _hospital_events:
        _hospital_events[hospital_id] = deque(maxlen=MAX_RECENT_EVENTS)
    
    _hospital_events[hospital_id].append({
        "event_type": event_type,
        "timestamp": datetime.utcnow(),
        "summary": summary,
    })


class HospitalDashboardService:
    """Service for Hospital Admin dashboard aggregations."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_dashboard(self, hospital_id: int) -> HospitalDashboard:
        """Get complete dashboard for a hospital."""
        
        # Get hospital
        hospital = await self._get_hospital(hospital_id)
        
        # Get ward utilization
        ward_utilization = await self._get_ward_utilization(hospital_id)
        
        # Calculate totals
        total_capacity = sum(w.total_capacity for w in ward_utilization)
        total_occupied = sum(w.occupied for w in ward_utilization)
        overall_pct = 0.0
        if total_capacity > 0:
            overall_pct = round((total_occupied / total_capacity) * 100, 1)
        
        # Get emergency counts
        active = await self._count_emergencies(hospital_id, EmergencyStatus.CREATED)
        assigned = await self._count_emergencies(hospital_id, EmergencyStatus.ASSIGNED)
        resolved_today = await self._count_resolved_today(hospital_id)
        
        # Get waste status
        waste_status = self._get_waste_status(hospital_id, total_occupied)
        
        # Get recent events
        recent_events = self._get_recent_events(hospital_id)
        
        return HospitalDashboard(
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            city=hospital.city,
            status=hospital.status.value,
            ward_utilization=ward_utilization,
            total_capacity=total_capacity,
            total_occupied=total_occupied,
            overall_occupancy_percentage=overall_pct,
            active_emergencies=active,
            assigned_emergencies=assigned,
            resolved_today=resolved_today,
            waste_status=waste_status,
            recent_events=recent_events,
        )

    async def _get_hospital(self, hospital_id: int) -> Hospital:
        """Get hospital or raise 404."""
        result = await self._session.execute(
            select(Hospital).where(Hospital.id == hospital_id)
        )
        hospital = result.scalar_one_or_none()
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital {hospital_id} not found",
            )
        return hospital

    async def _get_ward_utilization(self, hospital_id: int) -> list[WardUtilization]:
        """Get utilization for all wards."""
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital_id)
        )
        bed_groups = result.scalars().all()
        
        utilization = []
        for bg in bed_groups:
            available = bg.total_capacity - bg.occupied
            pct = 0.0
            if bg.total_capacity > 0:
                pct = round((bg.occupied / bg.total_capacity) * 100, 1)
            
            utilization.append(WardUtilization(
                ward_type=bg.ward_type.value.upper(),
                total_capacity=bg.total_capacity,
                occupied=bg.occupied,
                available=available,
                occupancy_percentage=pct,
            ))
        
        return utilization

    async def _count_emergencies(
        self, hospital_id: int, status_filter: EmergencyStatus
    ) -> int:
        """Count emergencies by status for this hospital."""
        result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                and_(
                    EmergencyCase.hospital_id == hospital_id,
                    EmergencyCase.status == status_filter,
                )
            )
        )
        return result.scalar_one()

    async def _count_resolved_today(self, hospital_id: int) -> int:
        """Count emergencies resolved today."""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                and_(
                    EmergencyCase.hospital_id == hospital_id,
                    EmergencyCase.status == EmergencyStatus.RESOLVED,
                    EmergencyCase.resolved_at >= today_start,
                )
            )
        )
        return result.scalar_one()

    def _get_waste_status(self, hospital_id: int, occupied_beds: int) -> WasteStatus:
        """
        Get waste status for hospital.
        
        Note: Waste is event-based, not persisted.
        This estimates based on bed occupancy.
        """
        # Estimate: ~1.5 kg per occupied bed per day
        estimated_kg = round(occupied_beds * 1.5, 1)
        
        # Determine alert level
        alert_level = "normal"
        collection_due = False
        
        if estimated_kg >= 150:
            alert_level = "critical"
            collection_due = True
        elif estimated_kg >= 75:
            alert_level = "warning"
            collection_due = True
        
        return WasteStatus(
            alert_level=alert_level,
            estimated_kg=estimated_kg,
            last_collection=None,  # Would come from waste module
            collection_due=collection_due,
        )

    def _get_recent_events(self, hospital_id: int) -> list[RecentEvent]:
        """Get recent events for this hospital."""
        if hospital_id not in _hospital_events:
            return []
        
        events = list(_hospital_events[hospital_id])
        events.reverse()  # Most recent first
        
        return [
            RecentEvent(
                event_type=e["event_type"],
                timestamp=e["timestamp"],
                summary=e["summary"],
            )
            for e in events
        ]
