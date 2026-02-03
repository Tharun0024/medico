"""
Hospital Repository

Data access layer for hospital operations.
"""

from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital


class HospitalRepository:
    """Repository for hospital database operations."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, hospital: Hospital) -> Hospital:
        """Insert a new hospital into the database."""
        self._session.add(hospital)
        await self._session.commit()
        await self._session.refresh(hospital)
        return hospital

    async def get_by_id(self, hospital_id: int) -> Optional[Hospital]:
        """Fetch a hospital by ID."""
        result = await self._session.execute(
            select(Hospital).where(Hospital.id == hospital_id)
        )
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[Hospital]:
        """Fetch all hospitals with pagination."""
        result = await self._session.execute(
            select(Hospital).offset(skip).limit(limit)
        )
        return result.scalars().all()

    async def count(self) -> int:
        """Count total hospitals."""
        result = await self._session.execute(select(func.count(Hospital.id)))
        return result.scalar_one()
