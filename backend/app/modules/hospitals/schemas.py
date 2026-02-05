"""
Hospital Schemas

Pydantic models for request/response validation.

IMPORTANT: Hospitals are seeded from backend/data/hospitals.json.
Manual creation via API is disabled to ensure MEDICO and AMB
use consistent hospital IDs.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.hospitals.models import HospitalStatus


class HospitalBase(BaseModel):
    """Base schema with common hospital fields."""
    name: str
    city: str


class HospitalCreate(HospitalBase):
    """
    Schema for creating a new hospital.
    
    For API creation, id will be auto-assigned if not provided.
    For seeded hospitals, id and amb_id come from hospitals.json.
    """
    id: Optional[int] = Field(None, description="Explicit hospital ID (for seeding)")
    amb_id: Optional[str] = Field(None, description="AMB cross-reference ID (e.g., HOSP-001)")
    lat: Optional[float] = Field(None, description="Latitude coordinate")
    lng: Optional[float] = Field(None, description="Longitude coordinate")
    status: Optional[HospitalStatus] = HospitalStatus.ACTIVE


class HospitalResponse(HospitalBase):
    """Schema for hospital responses."""
    id: int
    amb_id: Optional[str] = Field(None, description="AMB cross-reference ID (e.g., HOSP-001)")
    lat: Optional[float] = Field(None, description="Latitude coordinate")
    lng: Optional[float] = Field(None, description="Longitude coordinate")
    status: HospitalStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HospitalList(BaseModel):
    """Schema for paginated hospital list."""
    items: list[HospitalResponse]
    total: int
