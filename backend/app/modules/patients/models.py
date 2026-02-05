"""
Patient Model

SQLAlchemy model for operational patient tracking.
No PII-heavy EHR data - just operational fields for bed/ward management.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database.base import Base
from app.modules.beds.models import WardType


class PatientStatus(str, enum.Enum):
    """Patient status in the hospital."""
    ADMITTED = "admitted"           # Admitted but no bed assigned
    ASSIGNED = "assigned"           # Assigned to a bed
    IN_TREATMENT = "in_treatment"   # Actively receiving treatment
    DISCHARGED = "discharged"       # Discharged from hospital


class TreatmentType(str, enum.Enum):
    """General treatment categories (not clinical diagnoses)."""
    OBSERVATION = "observation"
    SURGICAL = "surgical"
    MEDICAL = "medical"
    CRITICAL_CARE = "critical_care"
    PEDIATRIC = "pediatric"
    MATERNITY = "maternity"
    EMERGENCY = "emergency"
    REHABILITATION = "rehabilitation"
    OTHER = "other"


class Patient(Base):
    """
    Operational patient record for bed and ward management.
    
    This is NOT an EHR - it tracks operational status only:
    - Which hospital/ward/bed
    - Admission/discharge status
    - General treatment type (for waste prediction)
    
    No PII stored - just an internal tracking ID.
    """

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Hospital association
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Bed/Ward assignment (nullable until assigned)
    bed_group_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("bed_groups.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ward_type: Mapped[Optional[WardType]] = mapped_column(
        SQLEnum(WardType),
        nullable=True,
    )
    
    # Status tracking
    status: Mapped[PatientStatus] = mapped_column(
        SQLEnum(PatientStatus),
        default=PatientStatus.ADMITTED,
        nullable=False,
        index=True,
    )
    
    # Treatment type (for waste prediction)
    treatment_type: Mapped[Optional[TreatmentType]] = mapped_column(
        SQLEnum(TreatmentType),
        nullable=True,
    )
    
    # Operational notes (non-clinical)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Emergency link (if admitted from emergency)
    emergency_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("emergency_cases.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    # Timestamps
    admitted_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    assigned_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    discharged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Patient(id={self.id}, hospital={self.hospital_id}, status={self.status.value})>"
