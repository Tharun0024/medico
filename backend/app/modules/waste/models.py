"""
Waste Models

SQLAlchemy models for waste management and disposal tracking.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database.base import Base


class WasteRequestStatus(str, enum.Enum):
    """State machine for waste pickup requests."""
    REQUESTED = "requested"    # Hospital admin requested pickup
    COLLECTED = "collected"    # Waste team collected the waste
    DISPOSED = "disposed"      # Waste has been disposed
    PAID = "paid"              # Payment received


class DisposalMethod(str, enum.Enum):
    """Disposal methods for medical waste."""
    INCINERATION = "incineration"
    AUTOCLAVE = "autoclave"
    CHEMICAL = "chemical"
    LANDFILL = "landfill"
    RECYCLING = "recycling"
    OTHER = "other"


class WasteRequest(Base):
    """
    Waste pickup request with full state machine tracking.
    
    State transitions:
    REQUESTED → COLLECTED → DISPOSED → PAID
    """

    __tablename__ = "waste_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    request_id: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    
    # Hospital association
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Request details
    reported_waste_kg: Mapped[float] = mapped_column(Float, nullable=False)
    urgency: Mapped[str] = mapped_column(String(20), default="normal")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Status tracking
    status: Mapped[WasteRequestStatus] = mapped_column(
        SQLEnum(WasteRequestStatus),
        default=WasteRequestStatus.REQUESTED,
        nullable=False,
        index=True,
    )
    
    # Collection details
    collected_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    collected_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    collected_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Disposal details
    disposal_method: Mapped[Optional[DisposalMethod]] = mapped_column(
        SQLEnum(DisposalMethod),
        nullable=True,
    )
    disposed_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    disposed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    disposed_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    disposal_facility: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    disposal_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Payment details
    payment_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    paid_by: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Audit timestamps
    requested_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    requested_by: Mapped[str] = mapped_column(String(50), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<WasteRequest(id={self.request_id}, hospital={self.hospital_id}, status={self.status.value})>"


class DisposalLog(Base):
    """
    Immutable disposal log for audit trail.
    
    Each action on a waste request creates a log entry.
    """

    __tablename__ = "disposal_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Link to waste request
    waste_request_id: Mapped[int] = mapped_column(
        ForeignKey("waste_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    request_id: Mapped[str] = mapped_column(String(50), index=True)
    
    # Action details
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # requested, collected, disposed, paid
    previous_status: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    
    # Context
    hospital_id: Mapped[int] = mapped_column(Integer, nullable=False)
    waste_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Disposal specific
    disposal_method: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    disposal_facility: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    # Payment specific
    payment_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    payment_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Audit
    performed_by: Mapped[str] = mapped_column(String(50), nullable=False)
    performed_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<DisposalLog(id={self.id}, request={self.request_id}, action={self.action})>"
