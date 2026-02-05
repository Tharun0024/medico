"""
Hospital Admin Schemas

Pydantic models for Hospital Admin Phase-2 operations.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

from app.modules.beds.models import WardType


# ─────────────────────────────────────────────────────────────────────────────
# Ward Capacity Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WardStatus(BaseModel):
    """Read-only status of a single ward."""
    
    ward_type: str
    bed_group_id: int
    total_capacity: int
    occupied: int
    available: int
    occupancy_percentage: float
    
    model_config = ConfigDict(from_attributes=True)


class WardStatusResponse(BaseModel):
    """Response for GET /api/hospital/wards - read-only ward listing."""
    
    hospital_id: int
    hospital_name: str
    wards: List[WardStatus]
    total_capacity: int
    total_occupied: int
    total_available: int
    overall_occupancy_percentage: float
    retrieved_at: datetime


class WardCapacityUpdate(BaseModel):
    """Update for a single ward type."""
    
    ward_type: WardType = Field(..., description="Ward type to update (icu, hdu, general)")
    new_capacity: int = Field(..., ge=1, description="New total capacity (must be >= 1)")


class WardCapacityUpdateRequest(BaseModel):
    """Request to update ward capacities."""
    
    wards: List[WardCapacityUpdate] = Field(
        ..., 
        min_length=1,
        description="List of ward capacity updates"
    )
    reason: Optional[str] = Field(None, description="Reason for capacity change (for audit)")


class WardCapacityStatus(BaseModel):
    """Current status of a ward."""
    
    ward_type: str
    bed_group_id: int
    previous_capacity: int
    new_capacity: int
    occupied: int
    available: int
    occupancy_percentage: float
    
    model_config = ConfigDict(from_attributes=True)


class WardCapacityUpdateResponse(BaseModel):
    """Response after updating ward capacities."""
    
    hospital_id: int
    hospital_name: str
    updated_wards: List[WardCapacityStatus]
    message: str
    updated_at: datetime


# ─────────────────────────────────────────────────────────────────────────────
# Waste Prediction Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WastePredictionByWard(BaseModel):
    """Waste prediction for a single ward type."""
    
    ward_type: str
    occupied_beds: int
    waste_rate_kg_per_day: float
    predicted_daily_kg: float


class WastePrediction(BaseModel):
    """Waste prediction for the hospital."""
    
    hospital_id: int
    hospital_name: str
    
    # Current status
    current_waste_kg: float
    alert_level: str  # normal, warning, critical
    
    # Predictions
    total_occupied_beds: int
    predicted_daily_kg: float
    predicted_weekly_kg: float
    by_ward: List[WastePredictionByWard]
    
    # Threshold info
    warning_threshold_kg: float
    critical_threshold_kg: float
    estimated_days_to_warning: Optional[float] = None
    estimated_days_to_critical: Optional[float] = None
    
    # Comparison
    collection_recommended: bool
    recommendation: str
    
    predicted_at: datetime


class WasteComparison(BaseModel):
    """Comparison of actual vs predicted waste."""
    
    hospital_id: int
    hospital_name: str
    period_days: int
    actual_waste_kg: float
    predicted_waste_kg: float
    variance_kg: float
    variance_percentage: float
    assessment: str  # "on_track", "above_predicted", "below_predicted"


# ─────────────────────────────────────────────────────────────────────────────
# Pickup Request Schemas
# ─────────────────────────────────────────────────────────────────────────────

class PickupRequestCreate(BaseModel):
    """Request to schedule a waste pickup."""
    
    urgency: str = Field(
        "normal", 
        pattern="^(normal|urgent|critical)$",
        description="Urgency level: normal, urgent, critical"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes for waste team")


class PickupRequestResponse(BaseModel):
    """Response after creating a pickup request."""
    
    request_id: str
    hospital_id: int
    hospital_name: str
    current_waste_kg: float
    urgency: str
    status: str  # pending, accepted, scheduled
    requested_at: datetime
    message: str
