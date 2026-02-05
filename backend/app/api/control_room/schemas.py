"""
Control Room Schemas

Pydantic models for control room operations.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.modules.emergencies.models import EmergencySeverity, EmergencyStatus


# ─────────────────────────────────────────────────────────────────────────────
# Assignment Request/Response Schemas
# ─────────────────────────────────────────────────────────────────────────────

class ManualAssignRequest(BaseModel):
    """Request to manually assign an emergency to a hospital."""
    
    hospital_id: int = Field(..., description="Target hospital ID")
    bed_group_id: int = Field(..., description="Target bed group ID for reservation")
    reason: Optional[str] = Field(None, description="Reason for manual assignment")


class ReassignRequest(BaseModel):
    """Request to reassign an emergency to a different hospital."""
    
    new_hospital_id: int = Field(..., description="New target hospital ID")
    new_bed_group_id: int = Field(..., description="New bed group ID for reservation")
    reason: str = Field(..., description="Reason for reassignment (required for audit)")


class AssignmentResponse(BaseModel):
    """Response for assignment/reassignment operations."""
    
    emergency_id: int
    status: EmergencyStatus
    hospital_id: int
    hospital_name: str
    bed_group_id: int
    ward_type: str
    previous_hospital_id: Optional[int] = None
    previous_hospital_name: Optional[str] = None
    message: str
    assigned_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ─────────────────────────────────────────────────────────────────────────────
# Metrics Schemas
# ─────────────────────────────────────────────────────────────────────────────

class SeverityMetrics(BaseModel):
    """Metrics for a specific severity level."""
    
    severity: EmergencySeverity
    total_count: int = 0
    pending_count: int = 0
    assigned_count: int = 0
    resolved_count: int = 0
    failed_count: int = 0
    avg_response_seconds: Optional[float] = None  # Time from created to assigned
    avg_resolution_seconds: Optional[float] = None  # Time from created to resolved


class ControlRoomMetrics(BaseModel):
    """Overall control room metrics."""
    
    # Summary counts
    total_emergencies: int = 0
    total_pending: int = 0
    total_assigned: int = 0
    total_resolved: int = 0
    total_failed: int = 0
    
    # Manual assignment counts
    manually_assigned_count: int = 0
    reassignment_count: int = 0
    
    # Response metrics
    avg_response_seconds: Optional[float] = None
    avg_resolution_seconds: Optional[float] = None
    
    # Breakdown by severity
    by_severity: list[SeverityMetrics] = []
    
    # Active emergencies needing attention
    pending_emergencies: int = 0
    
    # Time range
    metrics_from: Optional[datetime] = None
    metrics_to: Optional[datetime] = None


class HospitalLoadMetric(BaseModel):
    """Hospital load information for assignment decisions."""
    
    hospital_id: int
    hospital_name: str
    active_emergencies: int
    available_icu_beds: int
    available_hdu_beds: int
    available_general_beds: int
    total_occupancy_percent: float
    
    model_config = ConfigDict(from_attributes=True)


class HospitalLoadList(BaseModel):
    """List of hospital load metrics."""
    
    items: list[HospitalLoadMetric]
    total: int
