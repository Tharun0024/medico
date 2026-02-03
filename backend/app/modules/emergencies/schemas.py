"""
Emergency Schemas

Pydantic models for emergency case request/response validation.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.modules.emergencies.models import EmergencySeverity, EmergencyStatus


class EmergencyBase(BaseModel):
    """Base schema with common emergency fields."""
    severity: EmergencySeverity
    description: Optional[str] = None


class EmergencyCreate(EmergencyBase):
    """Schema for creating a new emergency case."""
    pass


class EmergencyResponse(EmergencyBase):
    """Schema for emergency case responses."""
    id: int
    status: EmergencyStatus
    hospital_id: Optional[int] = None
    bed_group_id: Optional[int] = None
    created_at: datetime
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmergencyList(BaseModel):
    """Schema for list of emergency cases."""
    items: list[EmergencyResponse]
    total: int


class AssignmentResult(BaseModel):
    """Result of emergency assignment operation."""
    emergency_id: int
    status: EmergencyStatus
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None
    bed_group_id: Optional[int] = None
    ward_type: Optional[str] = None
    message: str


class HospitalCandidate(BaseModel):
    """Hospital candidate for assignment."""
    hospital_id: int
    hospital_name: str
    bed_group_id: int
    ward_type: str
    available_beds: int
    occupancy_rate: float
