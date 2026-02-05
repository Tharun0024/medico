"""
Hospital Model

SQLAlchemy model for hospital registry.

IMPORTANT: Hospital IDs are explicitly assigned from backend/data/hospitals.json.
DO NOT rely on auto-increment. Use the seed_hospitals module to populate.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Enum as SQLEnum, Float
from sqlalchemy.orm import Mapped, mapped_column
import enum

from app.database.base import Base


class HospitalStatus(enum.Enum):
    """Hospital operational status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class Hospital(Base):
    """
    Hospital entity representing a registered medical facility.
    
    CRITICAL: The `id` field uses explicit assignment, NOT auto-increment.
    All hospitals must be seeded from backend/data/hospitals.json to ensure
    MEDICO and AMB use identical hospital IDs.
    
    The `amb_id` field stores the corresponding AMB string ID (e.g., "HOSP-001")
    for cross-system reference.
    """

    __tablename__ = "hospitals"

    # Explicit ID assignment - NOT auto-increment
    # This ensures MEDICO IDs match exactly what's in hospitals.json
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    
    # AMB cross-reference ID (e.g., "HOSP-001")
    # Nullable for hospitals created manually (not from shared data)
    amb_id: Mapped[Optional[str]] = mapped_column(String(20), unique=True, nullable=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Coordinates for hospital location (from shared data)
    lat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    lng: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
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
        return f"<Hospital(id={self.id}, amb_id='{self.amb_id}', name='{self.name}')>"
