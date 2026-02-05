"""
Hospital Service

Business logic layer for hospital operations.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital
from app.modules.hospitals.schemas import HospitalCreate, HospitalResponse, HospitalList
from app.modules.hospitals.repository import HospitalRepository


class HospitalService:
    """Service layer for hospital business logic."""

    def __init__(self, session: AsyncSession):
        self._repository = HospitalRepository(session)

    async def create_hospital(self, data: HospitalCreate) -> HospitalResponse:
        """Create a new hospital."""
        # If no explicit ID provided, auto-generate one
        hospital_id = data.id
        if hospital_id is None:
            # Get max ID and increment
            max_id = await self._repository.get_max_id()
            hospital_id = (max_id or 0) + 1
        
        hospital = Hospital(
            id=hospital_id,
            amb_id=data.amb_id,  # Can be None for manually created hospitals
            name=data.name,
            city=data.city,
            lat=data.lat,
            lng=data.lng,
            status=data.status,
        )
        created = await self._repository.create(hospital)
        return HospitalResponse.model_validate(created)

    async def list_hospitals(self, skip: int = 0, limit: int = 100) -> HospitalList:
        """List all hospitals with pagination."""
        hospitals = await self._repository.get_all(skip=skip, limit=limit)
        total = await self._repository.count()

        return HospitalList(
            items=[HospitalResponse.model_validate(h) for h in hospitals],
            total=total,
        )
