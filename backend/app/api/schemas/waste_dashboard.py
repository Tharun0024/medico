"""
Waste Dashboard Schemas

Pydantic models for Waste Management Team dashboard responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from enum import Enum


class AlertLevel(str, Enum):
    """Waste alert levels."""
    NORMAL = "normal"
    WARNING = "warning"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    """Waste collection task status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class HospitalWasteStatus(BaseModel):
    """Waste status for a single hospital."""
    
    hospital_id: int
    hospital_name: str
    city: str
    current_waste_kg: float
    threshold_warning_kg: float
    threshold_critical_kg: float
    alert_level: AlertLevel
    pending_collection: bool
    last_collection: Optional[datetime] = None
    occupied_beds: int


class WasteDashboard(BaseModel):
    """Complete waste dashboard response."""
    
    total_hospitals: int
    hospitals_normal: int
    hospitals_warning: int
    hospitals_critical: int
    total_pending_kg: float
    hospitals: list[HospitalWasteStatus]


class WasteTask(BaseModel):
    """Waste collection task."""
    
    task_id: str
    hospital_id: int
    hospital_name: str
    city: str
    waste_kg: float
    alert_level: AlertLevel
    status: TaskStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    priority: int  # 1 = highest (critical), 3 = lowest (normal)


class WasteTaskList(BaseModel):
    """List of waste collection tasks."""
    
    items: list[WasteTask]
    total: int
    pending_count: int
    completed_today: int


class TaskCompleteRequest(BaseModel):
    """Request to complete a waste collection task."""
    
    collected_kg: Optional[float] = None
    notes: Optional[str] = None


class TaskCompleteResponse(BaseModel):
    """Response after completing a waste collection task."""
    
    task_id: str
    hospital_id: int
    status: TaskStatus
    collected_kg: float
    completed_at: datetime
    message: str
