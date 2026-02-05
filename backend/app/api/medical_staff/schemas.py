"""
Medical Staff Schemas

Pydantic models for Medical Staff Phase-2 operations.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

from app.modules.beds.models import WardType
from app.modules.patients.models import PatientStatus, TreatmentType


# ─────────────────────────────────────────────────────────────────────────────
# Patient Schemas
# ─────────────────────────────────────────────────────────────────────────────

class PatientAdmitRequest(BaseModel):
    """Request to admit a new patient."""
    
    ward_type: Optional[WardType] = Field(
        None, 
        description="Preferred ward type (optional, can be assigned later)"
    )
    treatment_type: Optional[TreatmentType] = Field(
        None, 
        description="Initial treatment type"
    )
    emergency_id: Optional[int] = Field(
        None, 
        description="Link to emergency case if admitted from emergency"
    )
    notes: Optional[str] = Field(
        None, 
        max_length=1000, 
        description="Operational notes (non-clinical)"
    )


class PatientResponse(BaseModel):
    """Patient response schema."""
    
    id: int
    hospital_id: int
    bed_group_id: Optional[int]
    ward_type: Optional[str]
    status: PatientStatus
    treatment_type: Optional[TreatmentType]
    notes: Optional[str]
    emergency_id: Optional[int]
    admitted_at: datetime
    assigned_at: Optional[datetime]
    discharged_at: Optional[datetime]
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PatientList(BaseModel):
    """List of patients."""
    
    items: List[PatientResponse]
    total: int


class BedAssignRequest(BaseModel):
    """Request to assign patient to a bed."""
    
    bed_group_id: int = Field(..., description="Bed group to assign patient to")


class BedAssignResponse(BaseModel):
    """Response after bed assignment."""
    
    patient_id: int
    hospital_id: int
    bed_group_id: int
    ward_type: str
    status: PatientStatus
    assigned_at: datetime
    message: str


class TransferRequest(BaseModel):
    """Request to transfer patient to a different bed/ward."""
    
    new_bed_group_id: int = Field(..., description="New bed group to transfer to")
    reason: Optional[str] = Field(None, max_length=500, description="Reason for transfer")


class TransferResponse(BaseModel):
    """Response after patient transfer."""
    
    patient_id: int
    previous_bed_group_id: int
    previous_ward_type: str
    new_bed_group_id: int
    new_ward_type: str
    transferred_at: datetime
    message: str


class DischargeRequest(BaseModel):
    """Request to discharge a patient."""
    
    notes: Optional[str] = Field(None, max_length=500, description="Discharge notes")


class DischargeResponse(BaseModel):
    """Response after patient discharge."""
    
    patient_id: int
    hospital_id: int
    released_bed_group_id: Optional[int]
    released_ward_type: Optional[str]
    discharged_at: datetime
    message: str


class TreatmentUpdateRequest(BaseModel):
    """Request to update patient treatment type."""
    
    treatment_type: TreatmentType = Field(..., description="New treatment type")
    notes: Optional[str] = Field(None, max_length=500, description="Treatment notes")


class TreatmentUpdateResponse(BaseModel):
    """Response after treatment update."""
    
    patient_id: int
    previous_treatment: Optional[TreatmentType]
    new_treatment: TreatmentType
    updated_at: datetime
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Waste Report Schemas
# ─────────────────────────────────────────────────────────────────────────────

class WasteCategory(str, Enum):
    """Waste category for reporting."""
    GENERAL = "general"
    INFECTIOUS = "infectious"
    SHARPS = "sharps"
    PHARMACEUTICAL = "pharmaceutical"
    CHEMICAL = "chemical"
    RADIOACTIVE = "radioactive"


class WasteReportRequest(BaseModel):
    """Request to submit a waste report."""
    
    waste_kg: float = Field(..., gt=0, description="Amount of waste in kg")
    ward_type: WardType = Field(..., description="Ward where waste was generated")
    category: str = Field(
        "general", 
        pattern="^(general|infectious|sharps|pharmaceutical|chemical|radioactive)$",
        description="Waste category"
    )
    notes: Optional[str] = Field(None, max_length=500, description="Additional notes")


class WasteReportResponse(BaseModel):
    """Response after waste report submission."""
    
    report_id: str
    hospital_id: int
    ward_type: str
    waste_kg: float
    category: str
    total_hospital_waste_kg: float
    alert_level: str
    reported_at: datetime
    message: str


class WastePredictionRequest(BaseModel):
    """Request to trigger waste prediction refresh."""
    
    include_comparison: bool = Field(
        False, 
        description="Include actual vs predicted comparison"
    )


class WastePredictionResponse(BaseModel):
    """Response with updated waste prediction."""
    
    hospital_id: int
    hospital_name: str
    current_waste_kg: float
    predicted_daily_kg: float
    predicted_weekly_kg: float
    alert_level: str
    collection_recommended: bool
    recommendation: str
    
    # Comparison (optional)
    actual_vs_predicted_variance: Optional[float] = None
    variance_assessment: Optional[str] = None
    
    predicted_at: datetime
