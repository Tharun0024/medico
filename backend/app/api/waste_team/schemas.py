"""
Waste Team Schemas

Pydantic models for Waste Team Phase-2 operations.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

from app.modules.waste.models import WasteRequestStatus, DisposalMethod


# ─────────────────────────────────────────────────────────────────────────────
# Pickup Request Schemas
# ─────────────────────────────────────────────────────────────────────────────

class PickupRequestView(BaseModel):
    """View of a waste pickup request."""
    
    request_id: str
    hospital_id: int
    hospital_name: str
    reported_waste_kg: float
    urgency: str  # normal, urgent, critical
    status: WasteRequestStatus
    notes: Optional[str]
    
    # Collection info (if collected)
    collected_kg: Optional[float] = None
    collected_at: Optional[datetime] = None
    collected_by: Optional[str] = None
    
    # Disposal info (if disposed)
    disposal_method: Optional[DisposalMethod] = None
    disposed_kg: Optional[float] = None
    disposed_at: Optional[datetime] = None
    disposed_by: Optional[str] = None
    disposal_facility: Optional[str] = None
    
    # Payment info (if paid)
    payment_amount: Optional[float] = None
    payment_reference: Optional[str] = None
    paid_at: Optional[datetime] = None
    
    # Audit
    requested_at: datetime
    requested_by: str
    
    model_config = ConfigDict(from_attributes=True)


class PickupRequestList(BaseModel):
    """List of pickup requests."""
    
    items: List[PickupRequestView]
    total: int
    pending_count: int
    collected_count: int
    disposed_count: int
    paid_count: int


# ─────────────────────────────────────────────────────────────────────────────
# Collection Schemas
# ─────────────────────────────────────────────────────────────────────────────

class CollectRequest(BaseModel):
    """Request to mark waste as collected."""
    
    collected_kg: float = Field(..., gt=0, description="Actual weight collected in kg")
    notes: Optional[str] = Field(None, max_length=500, description="Collection notes")


class CollectResponse(BaseModel):
    """Response after marking waste as collected."""
    
    request_id: str
    hospital_id: int
    hospital_name: str
    reported_waste_kg: float
    collected_kg: float
    variance_kg: float
    variance_percentage: float
    status: WasteRequestStatus
    collected_at: datetime
    collected_by: str
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Disposal Schemas
# ─────────────────────────────────────────────────────────────────────────────

class DisposeRequest(BaseModel):
    """Request to mark waste as disposed."""
    
    disposed_kg: float = Field(..., gt=0, description="Weight disposed in kg")
    disposal_method: DisposalMethod = Field(..., description="Method of disposal")
    disposal_facility: str = Field(..., min_length=1, max_length=200, description="Disposal facility name")
    notes: Optional[str] = Field(None, max_length=500, description="Disposal notes")


class DisposeResponse(BaseModel):
    """Response after marking waste as disposed."""
    
    request_id: str
    hospital_id: int
    hospital_name: str
    collected_kg: float
    disposed_kg: float
    disposal_method: DisposalMethod
    disposal_facility: str
    status: WasteRequestStatus
    disposed_at: datetime
    disposed_by: str
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Payment Schemas
# ─────────────────────────────────────────────────────────────────────────────

class PaymentRequest(BaseModel):
    """Request to mark payment as received."""
    
    payment_amount: float = Field(..., gt=0, description="Payment amount received")
    payment_reference: str = Field(..., min_length=1, max_length=100, description="Payment reference number")
    notes: Optional[str] = Field(None, max_length=500, description="Payment notes")


class PaymentResponse(BaseModel):
    """Response after marking payment as received."""
    
    request_id: str
    hospital_id: int
    hospital_name: str
    disposed_kg: float
    payment_amount: float
    payment_reference: str
    status: WasteRequestStatus
    paid_at: datetime
    paid_by: str
    message: str


# ─────────────────────────────────────────────────────────────────────────────
# Disposal Log Schemas
# ─────────────────────────────────────────────────────────────────────────────

class DisposalLogEntry(BaseModel):
    """A single disposal log entry."""
    
    id: int
    request_id: str
    action: str
    previous_status: Optional[str]
    new_status: str
    hospital_id: int
    waste_kg: Optional[float]
    disposal_method: Optional[str]
    disposal_facility: Optional[str]
    payment_amount: Optional[float]
    payment_reference: Optional[str]
    performed_by: str
    performed_at: datetime
    notes: Optional[str]
    
    model_config = ConfigDict(from_attributes=True)


class DisposalLogList(BaseModel):
    """List of disposal log entries."""
    
    items: List[DisposalLogEntry]
    total: int
