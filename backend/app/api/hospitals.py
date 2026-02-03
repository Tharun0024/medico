"""
Hospital API Endpoints

REST API for hospital registry operations.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.modules.hospitals.schemas import HospitalCreate, HospitalResponse, HospitalList
from app.modules.hospitals.service import HospitalService

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


def get_hospital_service(session: AsyncSession = Depends(get_db)) -> HospitalService:
    """Dependency for hospital service."""
    return HospitalService(session)


@router.post(
    "",
    response_model=HospitalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new hospital",
)
async def create_hospital(
    data: HospitalCreate,
    service: HospitalService = Depends(get_hospital_service),
) -> HospitalResponse:
    """
    Register a new hospital in the system.

    - **name**: Hospital name
    - **city**: City where the hospital is located
    - **status**: Operational status (active, inactive, maintenance)
    """
    return await service.create_hospital(data)


@router.get(
    "",
    response_model=HospitalList,
    summary="List all hospitals",
)
async def list_hospitals(
    skip: int = 0,
    limit: int = 100,
    service: HospitalService = Depends(get_hospital_service),
) -> HospitalList:
    """
    Retrieve a list of all registered hospitals.

    Supports pagination via skip and limit parameters.
    """
    return await service.list_hospitals(skip=skip, limit=limit)
