"""
Emergency Services Dashboard API

Read-only endpoints for Emergency Services team.
Cross-hospital visibility for real-time bed availability and hospital suggestions.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.rbac import RequestContext, UserRole, require_role
from app.api.services.emergency_dashboard_service import EmergencyDashboardService
from app.api.schemas.emergency_dashboard import (
    EmergencyDashboard,
    BedAvailabilityResponse,
    HospitalSuggestionsResponse,
)


router = APIRouter(prefix="/emergency", tags=["Emergency Services Dashboard"])


def get_service(session: AsyncSession = Depends(get_db)) -> EmergencyDashboardService:
    """Dependency for Emergency Dashboard service."""
    return EmergencyDashboardService(session)


@router.get(
    "/dashboard",
    response_model=EmergencyDashboard,
    summary="Get emergency services dashboard",
    description="Aggregated view of system-wide ICU availability and active emergencies.",
)
async def get_dashboard(
    ctx: RequestContext = Depends(require_role(UserRole.EMERGENCY_SERVICE)),
    service: EmergencyDashboardService = Depends(get_service),
) -> EmergencyDashboard:
    """
    Get aggregated dashboard metrics for emergency coordinators.
    
    Returns:
        - total_hospitals: Active hospitals in the system
        - hospitals_with_icu_available: Hospitals with at least 1 ICU bed free
        - total_icu_available: Total ICU beds available across all hospitals
        - active_emergencies: Emergencies in CREATED or ASSIGNED status
        - last_updated: Timestamp of data retrieval
    """
    return await service.get_dashboard()


@router.get(
    "/bed-availability",
    response_model=BedAvailabilityResponse,
    summary="Get bed availability across hospitals",
    description="Per-hospital breakdown of ICU, HDU, and General ward availability.",
)
async def get_bed_availability(
    ctx: RequestContext = Depends(require_role(UserRole.EMERGENCY_SERVICE)),
    service: EmergencyDashboardService = Depends(get_service),
) -> BedAvailabilityResponse:
    """
    Get bed availability breakdown for all active hospitals.
    
    Returns list of hospitals with:
        - hospital_id, hospital_name
        - ICU_available, HDU_available, GENERAL_available
    """
    return await service.get_bed_availability()


@router.get(
    "/suggest-hospital",
    response_model=HospitalSuggestionsResponse,
    summary="Get hospital suggestions for emergency",
    description="Ranked list of suitable hospitals based on severity and availability.",
)
async def suggest_hospital(
    severity: str = Query(
        "NORMAL",
        description="Emergency severity: CRITICAL, HIGH, or NORMAL",
        regex="^(critical|high|normal|CRITICAL|HIGH|NORMAL)$",
    ),
    ctx: RequestContext = Depends(require_role(UserRole.EMERGENCY_SERVICE)),
    service: EmergencyDashboardService = Depends(get_service),
) -> HospitalSuggestionsResponse:
    """
    Get ranked hospital suggestions for a given emergency severity.
    
    Ranking logic:
        - CRITICAL: Prioritizes hospitals with ICU availability
        - HIGH: ICU preferred, HDU as fallback
        - NORMAL: HDU preferred, General ward as fallback
    
    Suitability score (0-100) based on:
        - Ward type match with severity
        - Number of available beds
        - Overall occupancy rate
    
    Returns ordered list from most suitable to least suitable.
    """
    return await service.suggest_hospitals(severity)
