"""
Emergency Services Dashboard Schemas

Response models for Emergency Services team dashboard.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EmergencyDashboard(BaseModel):
    """Aggregated dashboard data for Emergency Services."""
    
    total_hospitals: int = Field(..., description="Total number of active hospitals")
    hospitals_with_icu_available: int = Field(..., description="Hospitals with at least 1 ICU bed available")
    total_icu_available: int = Field(..., description="Total ICU beds available across all hospitals")
    active_emergencies: int = Field(..., description="Count of emergencies in CREATED or ASSIGNED status")
    last_updated: datetime = Field(..., description="Timestamp of data retrieval")


class HospitalBedAvailability(BaseModel):
    """Bed availability breakdown for a single hospital."""
    
    hospital_id: int
    hospital_name: str
    ICU_available: int = Field(0, description="Available ICU beds")
    HDU_available: int = Field(0, description="Available HDU beds")
    GENERAL_available: int = Field(0, description="Available General ward beds")


class BedAvailabilityResponse(BaseModel):
    """Response containing bed availability across all hospitals."""
    
    hospitals: list[HospitalBedAvailability]
    last_updated: datetime


class SuggestedHospital(BaseModel):
    """A hospital suggestion for emergency intake."""
    
    hospital_id: int
    hospital_name: str
    suitability_score: float = Field(..., description="Score 0-100, higher is better")
    available_wards: list[str] = Field(..., description="Ward types with availability")


class HospitalSuggestionsResponse(BaseModel):
    """Response with ranked hospital suggestions."""
    
    severity: str = Field(..., description="Requested severity level")
    suggestions: list[SuggestedHospital]
    last_updated: datetime
