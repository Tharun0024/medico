"""
Admin Dashboard API Endpoints

REST API for Super Admin (Government) dashboard.
Read-only, aggregated, district-wide views.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.rbac import require_role, UserRole, RequestContext
from app.api.schemas.admin import SystemOverview, HospitalPerformanceList
from app.api.services.admin_service import AdminDashboardService

router = APIRouter(prefix="/admin", tags=["Admin Dashboard"])


def get_admin_service(session: AsyncSession = Depends(get_db)) -> AdminDashboardService:
    """Dependency for admin dashboard service."""
    return AdminDashboardService(session)


@router.get(
    "/overview",
    response_model=SystemOverview,
    summary="System-wide overview",
    description="Aggregated metrics across all hospitals. Super Admin only.",
)
async def get_system_overview(
    ctx: RequestContext = Depends(require_role(UserRole.SUPER_ADMIN)),
    service: AdminDashboardService = Depends(get_admin_service),
) -> SystemOverview:
    """
    Get district-wide system overview.

    Returns aggregated metrics including:
    - Total and active hospitals
    - ICU/HDU/General bed capacity and availability
    - Emergency counts by status
    - Waste alert count
    """
    return await service.get_system_overview()


@router.get(
    "/hospitals/performance",
    response_model=HospitalPerformanceList,
    summary="Hospital performance metrics",
    description="Performance metrics for all hospitals. Super Admin only.",
)
async def get_hospital_performance(
    ctx: RequestContext = Depends(require_role(UserRole.SUPER_ADMIN)),
    service: AdminDashboardService = Depends(get_admin_service),
) -> HospitalPerformanceList:
    """
    Get performance metrics for all hospitals.

    Returns for each hospital:
    - Occupancy percentage
    - ICU availability
    - Active emergency count
    """
    return await service.get_hospital_performance()
