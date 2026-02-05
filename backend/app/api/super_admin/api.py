"""
Super Admin API Router

Phase-2 governance endpoints for SUPER_ADMIN role.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.core.rbac import RequestContext, get_request_context, Role, require_role
from app.api.super_admin.service import SuperAdminService
from app.api.super_admin.schemas import (
    HospitalCreateRequest,
    HospitalUpdateRequest,
    HospitalResponse,
    DistrictBedSummary,
    DiseaseTrendResponse,
    OutbreakRiskResponse,
    AdminNoticeRequest,
    AdminNoticeResponse,
)


logger = logging.getLogger("medico.api.super_admin")

router = APIRouter(
    prefix="/api/admin",
    tags=["Super Admin (Phase-2)"],
)


# ============================================================================
# Hospital Management
# ============================================================================

@router.post(
    "/hospitals",
    response_model=HospitalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new hospital",
    description="Register a new hospital in the district. Can optionally set initial bed capacities.",
)
async def add_hospital(
    data: HospitalCreateRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(Role.SUPER_ADMIN)),
) -> HospitalResponse:
    """Add a new hospital to the registry."""
    service = SuperAdminService(session)
    return await service.create_hospital(data, ctx)


@router.patch(
    "/hospitals/{hospital_id}",
    response_model=HospitalResponse,
    summary="Update hospital details",
    description="Update hospital status, name, city, or capacity flags.",
)
async def update_hospital(
    hospital_id: int,
    data: HospitalUpdateRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(Role.SUPER_ADMIN)),
) -> HospitalResponse:
    """Update hospital details."""
    service = SuperAdminService(session)
    try:
        return await service.update_hospital(hospital_id, data, ctx)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# District Analytics
# ============================================================================

@router.get(
    "/bed-summary",
    response_model=DistrictBedSummary,
    summary="District-wide bed availability",
    description="Get comprehensive bed availability across all hospitals and ward types.",
)
async def get_bed_summary(
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(Role.SUPER_ADMIN)),
) -> DistrictBedSummary:
    """Get district-wide bed availability summary."""
    service = SuperAdminService(session)
    return await service.get_bed_summary()


@router.get(
    "/disease-trends",
    response_model=DiseaseTrendResponse,
    summary="Disease trends analysis",
    description="Aggregated disease trends from emergency and patient data.",
)
async def get_disease_trends(
    period_days: int = Query(
        default=7,
        ge=1,
        le=90,
        description="Time window for trend calculation (1-90 days)"
    ),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(Role.SUPER_ADMIN)),
) -> DiseaseTrendResponse:
    """Get disease trend analysis."""
    service = SuperAdminService(session)
    return await service.get_disease_trends(period_days)


@router.get(
    "/outbreak-risk",
    response_model=OutbreakRiskResponse,
    summary="Outbreak risk assessment",
    description="Rule-based outbreak risk inference using threshold analysis.",
)
async def get_outbreak_risk(
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(Role.SUPER_ADMIN)),
) -> OutbreakRiskResponse:
    """Assess current outbreak risk level."""
    service = SuperAdminService(session)
    return await service.assess_outbreak_risk()


# ============================================================================
# Notices / Reminders
# ============================================================================

@router.post(
    "/notify",
    response_model=AdminNoticeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send notice to hospitals",
    description="Send administrative notices or reminders to hospital staff.",
)
async def send_notice(
    data: AdminNoticeRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(Role.SUPER_ADMIN)),
) -> AdminNoticeResponse:
    """Send notice to target hospitals."""
    service = SuperAdminService(session)
    try:
        return await service.send_notice(data, ctx)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
