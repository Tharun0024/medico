"""
Bed Group Service

Business logic layer for bed and ward management.
"""

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_bus import emit_event, EventType
from app.modules.beds.models import BedGroup
from app.modules.beds.schemas import (
    BedGroupCreate,
    BedGroupResponse,
    BedGroupList,
    OccupancyUpdate,
    BedSummary,
)
from app.modules.beds.repository import BedGroupRepository


class BedGroupService:
    """Service layer for bed group business logic."""

    def __init__(self, session: AsyncSession):
        self._repository = BedGroupRepository(session)

    async def create_bed_group(self, data: BedGroupCreate) -> BedGroupResponse:
        """Create a new bed group (ward) for a hospital."""
        # Check if ward already exists for this hospital
        existing = await self._repository.get_by_hospital_and_ward(
            data.hospital_id, data.ward_type
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ward {data.ward_type.value} already exists for hospital {data.hospital_id}",
            )

        # Validate occupancy <= capacity
        if data.occupied > data.total_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Occupied beds cannot exceed total capacity",
            )

        bed_group = BedGroup(
            hospital_id=data.hospital_id,
            ward_type=data.ward_type,
            total_capacity=data.total_capacity,
            occupied=data.occupied,
        )
        created = await self._repository.create(bed_group)
        return self._to_response(created)

    async def get_hospital_beds(self, hospital_id: int) -> BedGroupList:
        """Get all bed groups for a hospital."""
        bed_groups = await self._repository.get_by_hospital(hospital_id)
        total = await self._repository.count_by_hospital(hospital_id)

        return BedGroupList(
            items=[self._to_response(bg) for bg in bed_groups],
            total=total,
        )

    async def update_occupancy(
        self, bed_group_id: int, data: OccupancyUpdate
    ) -> BedGroupResponse:
        """Update occupancy for a bed group."""
        bed_group = await self._repository.get_by_id(bed_group_id)
        if not bed_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bed group {bed_group_id} not found",
            )

        # Validate occupancy <= capacity
        if data.occupied > bed_group.total_capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Occupied ({data.occupied}) cannot exceed capacity ({bed_group.total_capacity})",
            )

        old_occupied = bed_group.occupied
        updated = await self._repository.update_occupancy(bed_group, data.occupied)

        # Emit event
        emit_event(EventType.BED_OCCUPANCY_UPDATED, {
            "bed_group_id": bed_group_id,
            "hospital_id": updated.hospital_id,
            "ward_type": updated.ward_type.value,
            "old_occupied": old_occupied,
            "new_occupied": data.occupied,
            "capacity": updated.total_capacity,
        })

        return self._to_response(updated)

    async def get_hospital_summary(self, hospital_id: int) -> BedSummary:
        """Get bed availability summary for a hospital."""
        bed_groups = await self._repository.get_by_hospital(hospital_id)

        total_capacity = 0
        total_occupied = 0
        by_ward = {}

        for bg in bed_groups:
            total_capacity += bg.total_capacity
            total_occupied += bg.occupied
            by_ward[bg.ward_type.value] = {
                "capacity": bg.total_capacity,
                "occupied": bg.occupied,
                "available": bg.available,
            }

        return BedSummary(
            hospital_id=hospital_id,
            total_capacity=total_capacity,
            total_occupied=total_occupied,
            total_available=total_capacity - total_occupied,
            by_ward=by_ward,
        )

    def _to_response(self, bed_group: BedGroup) -> BedGroupResponse:
        """Convert model to response schema."""
        return BedGroupResponse(
            id=bed_group.id,
            hospital_id=bed_group.hospital_id,
            ward_type=bed_group.ward_type,
            total_capacity=bed_group.total_capacity,
            occupied=bed_group.occupied,
            available=bed_group.available,
            occupancy_rate=bed_group.occupancy_rate,
            created_at=bed_group.created_at,
            updated_at=bed_group.updated_at,
        )
