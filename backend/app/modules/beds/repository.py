"""
Bed Group Repository

Data access layer for bed group operations.
"""

from typing import Optional, Sequence
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.beds.models import BedGroup, WardType


class BedGroupRepository:
    """Repository for bed group database operations."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, bed_group: BedGroup) -> BedGroup:
        """Insert a new bed group into the database."""
        self._session.add(bed_group)
        await self._session.commit()
        await self._session.refresh(bed_group)
        return bed_group

    async def get_by_id(self, bed_group_id: int) -> Optional[BedGroup]:
        """Fetch a bed group by ID."""
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.id == bed_group_id)
        )
        return result.scalar_one_or_none()

    async def get_by_hospital(self, hospital_id: int) -> Sequence[BedGroup]:
        """Fetch all bed groups for a hospital."""
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital_id)
        )
        return result.scalars().all()

    async def get_by_hospital_and_ward(
        self, hospital_id: int, ward_type: WardType
    ) -> Optional[BedGroup]:
        """Fetch a specific ward for a hospital."""
        result = await self._session.execute(
            select(BedGroup).where(
                BedGroup.hospital_id == hospital_id,
                BedGroup.ward_type == ward_type,
            )
        )
        return result.scalar_one_or_none()

    async def update_occupancy(self, bed_group: BedGroup, occupied: int) -> BedGroup:
        """Update occupancy for a bed group."""
        bed_group.occupied = occupied
        await self._session.commit()
        await self._session.refresh(bed_group)
        return bed_group

    async def count_by_hospital(self, hospital_id: int) -> int:
        """Count bed groups for a hospital."""
        result = await self._session.execute(
            select(func.count(BedGroup.id)).where(
                BedGroup.hospital_id == hospital_id
            )
        )
        return result.scalar_one()
