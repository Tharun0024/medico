"""
Hospital Model

SQLAlchemy model for hospital registry.
"""

from datetime import datetime
from sqlalchemy import String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database.base import Base


class HospitalStatus(enum.Enum):
    """Hospital operational status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class Hospital(Base):
    """Hospital entity representing a registered medical facility."""

    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[HospitalStatus] = mapped_column(
        SQLEnum(HospitalStatus),
        default=HospitalStatus.ACTIVE,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Hospital(id={self.id}, name='{self.name}', city='{self.city}')>"
