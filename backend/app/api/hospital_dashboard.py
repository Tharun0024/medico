"""
Hospital Dashboard API Endpoints

REST API for Hospital Admin dashboard.
Hospital-specific, operational view.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.rbac import require_role, UserRole, RequestContext
from app.api.schemas.hospital_dashboard import HospitalDashboard
from app.api.services.hospital_dashboard_service import HospitalDashboardService

router = APIRouter(prefix="/hospital", tags=["Hospital Dashboard"])


def get_hospital_dashboard_service(
    session: AsyncSession = Depends(get_db),
) -> HospitalDashboardService:
    """Dependency for hospital dashboard service."""
    return HospitalDashboardService(session)


@router.get(
    "/dashboard",
    response_model=HospitalDashboard,
    summary="Hospital dashboard",
    description="Complete dashboard for a specific hospital. Hospital Admin only.",
)
async def get_hospital_dashboard(
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN)),
    service: HospitalDashboardService = Depends(get_hospital_dashboard_service),
) -> HospitalDashboard:
    """
    Get complete dashboard for the hospital specified in X-Hospital-ID header.

    Returns:
    - Hospital info
    - Ward utilization (ICU, HDU, General)
    - Emergency counts
    - Waste status and alerts
    - Recent events
    """
    if not ctx.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Hospital-ID header is required for Hospital Admin",
        )
    
    return await service.get_dashboard(ctx.hospital_id)


@router.get(
    "/dashboard/{hospital_id}",
    response_model=HospitalDashboard,
    summary="Hospital dashboard by ID",
    description="Complete dashboard for a specific hospital. Hospital Admin only.",
)
async def get_hospital_dashboard_by_id(
    hospital_id: int,
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN)),
    service: HospitalDashboardService = Depends(get_hospital_dashboard_service),
) -> HospitalDashboard:
    """
    Get complete dashboard for a specific hospital by ID.
    
    Hospital Admins can only access their own hospital.
    Super Admins can access any hospital.
    """
    # Check access
    if ctx.role == UserRole.HOSPITAL_ADMIN:
        if ctx.hospital_id != hospital_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to hospital {hospital_id}",
            )
    
    return await service.get_dashboard(hospital_id)
