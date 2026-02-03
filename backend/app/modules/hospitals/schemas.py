"""
Hospital Schemas

Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.modules.hospitals.models import HospitalStatus


class HospitalBase(BaseModel):
    """Base schema with common hospital fields."""
    name: str
    city: str


class HospitalCreate(HospitalBase):
    """Schema for creating a new hospital."""
    status: Optional[HospitalStatus] = HospitalStatus.ACTIVE


class HospitalResponse(HospitalBase):
    """Schema for hospital responses."""
    id: int
    status: HospitalStatus
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HospitalList(BaseModel):
    """Schema for paginated hospital list."""
    items: list[HospitalResponse]
    total: int
