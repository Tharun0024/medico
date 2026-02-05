"""
Super Admin Schemas

Pydantic models for Super Admin governance APIs.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

from app.modules.hospitals.models import HospitalStatus
from app.modules.beds.models import WardType
from app.notifications.models import NotificationSeverity


# ============================================================================
# Hospital Management Schemas
# ============================================================================

class HospitalCreateRequest(BaseModel):
    """Request to add a new hospital."""
    
    name: str = Field(..., min_length=1, max_length=255, description="Hospital name")
    city: str = Field(..., min_length=1, max_length=100, description="City location")
    status: HospitalStatus = Field(
        default=HospitalStatus.ACTIVE, 
        description="Initial status"
    )
    # Initial ward capacities (optional)
    icu_capacity: int = Field(default=0, ge=0, description="ICU bed capacity")
    hdu_capacity: int = Field(default=0, ge=0, description="HDU bed capacity")
    general_capacity: int = Field(default=0, ge=0, description="General ward capacity")


class HospitalUpdateRequest(BaseModel):
    """Request to update hospital details."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    status: Optional[HospitalStatus] = Field(None, description="Update status")
    # Capacity flags (admin can adjust)
    accepting_emergencies: Optional[bool] = Field(
        None, 
        description="Flag to enable/disable emergency intake"
    )


class HospitalResponse(BaseModel):
    """Hospital response for admin APIs."""
    
    id: int
    amb_id: Optional[str] = Field(None, description="AMB cross-reference ID (e.g., HOSP-001)")
    name: str
    city: str
    lat: Optional[float] = Field(None, description="Latitude coordinate")
    lng: Optional[float] = Field(None, description="Longitude coordinate")
    status: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# Bed Summary Schemas
# ============================================================================

class WardSummary(BaseModel):
    """Summary for a single ward type."""
    
    ward_type: str
    total_capacity: int
    total_occupied: int
    total_available: int
    occupancy_rate: float = Field(..., description="Percentage occupied (0-100)")


class HospitalBedSummary(BaseModel):
    """Bed summary for a single hospital."""
    
    hospital_id: int
    hospital_name: str
    city: str
    status: str
    wards: List[WardSummary]
    total_beds: int
    total_occupied: int
    total_available: int
    overall_occupancy_rate: float


class DistrictBedSummary(BaseModel):
    """District-wide bed availability summary."""
    
    total_hospitals: int
    active_hospitals: int
    total_beds: int
    total_occupied: int
    total_available: int
    overall_occupancy_rate: float
    by_ward_type: List[WardSummary]
    hospitals: List[HospitalBedSummary]


# ============================================================================
# Disease Trends Schemas
# ============================================================================

class SeverityTrend(BaseModel):
    """Trend data for emergency severity."""
    
    severity: str
    count: int
    percentage: float


class WardAdmissionTrend(BaseModel):
    """Admission trend per ward type."""
    
    ward_type: str
    admission_count: int
    active_patients: int
    discharge_count: int


class DiseaseTrendResponse(BaseModel):
    """Disease trends aggregated from emergencies and patients."""
    
    period_days: int = Field(..., description="Time window for trend calculation")
    total_emergencies: int
    emergency_by_severity: List[SeverityTrend]
    total_admissions: int
    admissions_by_ward: List[WardAdmissionTrend]
    avg_daily_emergencies: float
    avg_daily_admissions: float
    trend_indicator: str = Field(
        ..., 
        description="INCREASING, STABLE, DECREASING based on recent data"
    )


# ============================================================================
# Outbreak Risk Schemas
# ============================================================================

class OutbreakRiskLevel(str, Enum):
    """Outbreak risk classification."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"


class RiskFactor(BaseModel):
    """Individual risk factor contribution."""
    
    factor: str
    value: float
    threshold: float
    exceeds: bool
    severity: str = Field(..., description="low, moderate, high")


class OutbreakRiskResponse(BaseModel):
    """Outbreak risk assessment based on rule thresholds."""
    
    risk_level: OutbreakRiskLevel
    confidence: float = Field(..., ge=0, le=1, description="Confidence score 0-1")
    factors: List[RiskFactor]
    recommendations: List[str]
    assessed_at: datetime


# ============================================================================
# Notice/Reminder Schemas
# ============================================================================

class AdminNoticeRequest(BaseModel):
    """Request to send notice to hospitals."""
    
    title: str = Field(..., min_length=1, max_length=200, description="Notice title")
    message: str = Field(..., min_length=1, description="Notice content")
    severity: NotificationSeverity = Field(
        default=NotificationSeverity.INFO,
        description="Notice severity level"
    )
    target_hospitals: Optional[List[int]] = Field(
        None,
        description="Specific hospital IDs, or null for all active hospitals"
    )
    target_role: str = Field(
        default="hospital_admin",
        description="Target role within hospitals"
    )


class AdminNoticeResponse(BaseModel):
    """Response after sending notice."""
    
    notice_id: str
    title: str
    message: str
    severity: str
    target_hospitals: List[int]
    notifications_created: int
    sent_at: datetime
