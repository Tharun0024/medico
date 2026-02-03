"""
Bed Group Schemas

Pydantic models for request/response validation.
"""

from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator

from app.modules.beds.models import WardType


class BedGroupBase(BaseModel):
    """Base schema with common bed group fields."""
    hospital_id: int
    ward_type: WardType
    total_capacity: int

    @field_validator("total_capacity")
    @classmethod
    def capacity_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("total_capacity must be positive")
        return v


class BedGroupCreate(BedGroupBase):
    """Schema for creating a new bed group."""
    occupied: int = 0

    @field_validator("occupied")
    @classmethod
    def occupied_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("occupied cannot be negative")
        return v


class BedGroupResponse(BedGroupBase):
    """Schema for bed group responses."""
    id: int
    occupied: int
    available: int
    occupancy_rate: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BedGroupList(BaseModel):
    """Schema for list of bed groups."""
    items: list[BedGroupResponse]
    total: int


class OccupancyUpdate(BaseModel):
    """Schema for updating occupancy."""
    occupied: int

    @field_validator("occupied")
    @classmethod
    def occupied_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("occupied cannot be negative")
        return v


class BedSummary(BaseModel):
    """Summary of bed availability for a hospital."""
    hospital_id: int
    total_capacity: int
    total_occupied: int
    total_available: int
    by_ward: dict[str, dict[str, int]]
