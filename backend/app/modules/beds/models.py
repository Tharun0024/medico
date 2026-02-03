"""
Bed Group Model

SQLAlchemy model for ward-level bed management.
"""

from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database.base import Base


class WardType(enum.Enum):
    """Ward classification types."""
    ICU = "icu"
    HDU = "hdu"
    GENERAL = "general"


class BedGroup(Base):
    """
    BedGroup represents a ward-level aggregation of beds.
    
    Instead of tracking individual beds, we track capacity and occupancy
    at the ward level for efficiency.
    """

    __tablename__ = "bed_groups"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(
        ForeignKey("hospitals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ward_type: Mapped[WardType] = mapped_column(
        SQLEnum(WardType),
        nullable=False,
    )
    total_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    occupied: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    # Constraints
    __table_args__ = (
        CheckConstraint("occupied >= 0", name="occupied_non_negative"),
        CheckConstraint("total_capacity > 0", name="capacity_positive"),
        CheckConstraint("occupied <= total_capacity", name="occupied_within_capacity"),
    )

    @property
    def available(self) -> int:
        """Calculate available beds."""
        return self.total_capacity - self.occupied

    @property
    def occupancy_rate(self) -> float:
        """Calculate occupancy percentage."""
        if self.total_capacity == 0:
            return 0.0
        return (self.occupied / self.total_capacity) * 100

    def __repr__(self) -> str:
        return f"<BedGroup(id={self.id}, hospital_id={self.hospital_id}, ward={self.ward_type.value}, {self.occupied}/{self.total_capacity})>"
