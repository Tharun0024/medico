"""
Medical Staff Dashboard API

Read-only endpoints for Medical Staff.
Ward-level operational view for a specific hospital.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.rbac import RequestContext, UserRole, require_role
from app.api.services.medical_dashboard_service import MedicalDashboardService
from app.api.schemas.medical_dashboard import (
    MedicalDashboard,
    WardsResponse,
)


router = APIRouter(prefix="/medical", tags=["Medical Staff Dashboard"])


def get_service(session: AsyncSession = Depends(get_db)) -> MedicalDashboardService:
    """Dependency for Medical Dashboard service."""
    return MedicalDashboardService(session)


def require_hospital_id(ctx: RequestContext) -> int:
    """Ensure hospital_id is present in context."""
    if ctx.hospital_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Hospital-ID header is required for medical staff",
        )
    return ctx.hospital_id


@router.get(
    "/dashboard",
    response_model=MedicalDashboard,
    summary="Get medical staff dashboard",
    description="Ward-level operational view with emergency flags.",
)
async def get_dashboard(
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF)),
    service: MedicalDashboardService = Depends(get_service),
) -> MedicalDashboard:
    """
    Get dashboard for medical staff.
    
    Requires X-Hospital-ID header.
    
    Returns:
        - hospital_id, hospital_name
        - wards: list of {ward_type, total_capacity, occupied, available}
        - active_emergencies: count of active cases at this hospital
        - emergency_flags: true if CRITICAL or HIGH severity cases exist
    """
    hospital_id = require_hospital_id(ctx)
    return await service.get_dashboard(hospital_id)


@router.get(
    "/wards",
    response_model=WardsResponse,
    summary="Get ward status",
    description="Detailed ward-level bed availability.",
)
async def get_wards(
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF)),
    service: MedicalDashboardService = Depends(get_service),
) -> WardsResponse:
    """
    Get ward-level breakdown for the hospital.
    
    Requires X-Hospital-ID header.
    
    Returns list of wards with:
        - ward_type (ICU, HDU, GENERAL)
        - total_capacity
        - occupied
        - available
    """
    hospital_id = require_hospital_id(ctx)
    return await service.get_wards(hospital_id)
