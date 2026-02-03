"""
Hospital Dashboard Schemas

Pydantic models for Hospital Admin dashboard responses.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class WardUtilization(BaseModel):
    """Utilization metrics for a single ward type."""
    
    ward_type: str
    total_capacity: int
    occupied: int
    available: int
    occupancy_percentage: float


class WasteStatus(BaseModel):
    """Waste status for a hospital."""
    
    alert_level: str  # normal, warning, critical
    estimated_kg: float
    last_collection: Optional[datetime] = None
    collection_due: bool


class RecentEvent(BaseModel):
    """Recent event summary."""
    
    event_type: str
    timestamp: datetime
    summary: str


class HospitalDashboard(BaseModel):
    """Complete hospital dashboard response."""
    
    hospital_id: int
    hospital_name: str
    city: str
    status: str
    ward_utilization: list[WardUtilization]
    total_capacity: int
    total_occupied: int
    overall_occupancy_percentage: float
    active_emergencies: int
    assigned_emergencies: int
    resolved_today: int
    waste_status: WasteStatus
    recent_events: list[RecentEvent]
