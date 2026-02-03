"""
Emergency Case Model

SQLAlchemy model for emergency case management.
"""

from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Enum as SQLEnum, Text
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database.base import Base


class EmergencySeverity(enum.Enum):
    """Emergency severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"


class EmergencyStatus(enum.Enum):
    """Emergency case status."""
    CREATED = "created"
    ASSIGNED = "assigned"
    RESOLVED = "resolved"
    FAILED = "failed"


class EmergencyCase(Base):
    """
    EmergencyCase represents an incoming emergency that requires
    hospital assignment and bed reservation.
    """

    __tablename__ = "emergency_cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    severity: Mapped[EmergencySeverity] = mapped_column(
        SQLEnum(EmergencySeverity),
        nullable=False,
    )
    status: Mapped[EmergencyStatus] = mapped_column(
        SQLEnum(EmergencyStatus),
        default=EmergencyStatus.CREATED,
        nullable=False,
    )
    hospital_id: Mapped[int | None] = mapped_column(
        ForeignKey("hospitals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    bed_group_id: Mapped[int | None] = mapped_column(
        ForeignKey("bed_groups.id", ondelete="SET NULL"),
        nullable=True,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<EmergencyCase(id={self.id}, severity={self.severity.value}, status={self.status.value})>"
