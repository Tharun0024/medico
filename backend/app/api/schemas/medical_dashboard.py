"""
Medical Staff Dashboard Schemas

Response models for Medical Staff dashboard.
"""

from datetime import datetime
from pydantic import BaseModel, Field


class WardStatus(BaseModel):
    """Status of a single ward."""
    
    ward_type: str = Field(..., description="ICU, HDU, or GENERAL")
    total_capacity: int = Field(..., description="Total beds in ward")
    occupied: int = Field(..., description="Currently occupied beds")
    available: int = Field(..., description="Available beds")


class MedicalDashboard(BaseModel):
    """Dashboard data for Medical Staff."""
    
    hospital_id: int
    hospital_name: str
    wards: list[WardStatus] = Field(default_factory=list, description="Status of all wards")
    active_emergencies: int = Field(..., description="Count of active emergencies at this hospital")
    emergency_flags: bool = Field(..., description="True if any CRITICAL or HIGH severity emergencies active")
    last_updated: datetime


class WardsResponse(BaseModel):
    """Response containing ward-level data."""
    
    hospital_id: int
    wards: list[WardStatus]
    last_updated: datetime
