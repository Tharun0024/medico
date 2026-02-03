"""
Bed Group API Endpoints

REST API for bed and ward management.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.modules.beds.schemas import (
    BedGroupCreate,
    BedGroupResponse,
    BedGroupList,
    OccupancyUpdate,
    BedSummary,
)
from app.modules.beds.service import BedGroupService

router = APIRouter(prefix="/beds", tags=["Beds"])


def get_bed_service(session: AsyncSession = Depends(get_db)) -> BedGroupService:
    """Dependency for bed group service."""
    return BedGroupService(session)


@router.post(
    "",
    response_model=BedGroupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ward bed group",
)
async def create_bed_group(
    data: BedGroupCreate,
    service: BedGroupService = Depends(get_bed_service),
) -> BedGroupResponse:
    """
    Create a new bed group (ward) for a hospital.

    - **hospital_id**: ID of the hospital
    - **ward_type**: Type of ward (ICU, HDU, GENERAL)
    - **total_capacity**: Total bed capacity
    - **occupied**: Currently occupied beds (default 0)
    """
    return await service.create_bed_group(data)


@router.get(
    "/{hospital_id}",
    response_model=BedGroupList,
    summary="Get hospital bed groups",
)
async def get_hospital_beds(
    hospital_id: int,
    service: BedGroupService = Depends(get_bed_service),
) -> BedGroupList:
    """
    Get all bed groups for a specific hospital.
    """
    return await service.get_hospital_beds(hospital_id)


@router.get(
    "/{hospital_id}/summary",
    response_model=BedSummary,
    summary="Get hospital bed summary",
)
async def get_hospital_bed_summary(
    hospital_id: int,
    service: BedGroupService = Depends(get_bed_service),
) -> BedSummary:
    """
    Get aggregated bed availability summary for a hospital.
    """
    return await service.get_hospital_summary(hospital_id)


@router.patch(
    "/{bed_group_id}/occupancy",
    response_model=BedGroupResponse,
    summary="Update bed occupancy",
)
async def update_occupancy(
    bed_group_id: int,
    data: OccupancyUpdate,
    service: BedGroupService = Depends(get_bed_service),
) -> BedGroupResponse:
    """
    Update the occupancy count for a bed group.

    Occupancy cannot exceed total capacity.
    """
    return await service.update_occupancy(bed_group_id, data)
