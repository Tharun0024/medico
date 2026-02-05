"""
Hospital Admin API - Phase 2

Endpoints for Hospital Admin operational features:
- Ward capacity management
- Waste prediction and comparison
- Waste pickup requests
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.core.rbac import RequestContext, get_current_context, require_role, UserRole
from app.api.hospital_admin.service import HospitalAdminService
from app.api.hospital_admin.schemas import (
    WardStatus,
    WardStatusResponse,
    WardCapacityUpdateRequest,
    WardCapacityUpdateResponse,
    WastePrediction,
    WasteComparison,
    PickupRequestCreate,
    PickupRequestResponse,
)


router = APIRouter(
    prefix="/api/hospital",
    tags=["hospital-admin"],
)


import logging

logger = logging.getLogger("medico.hospital_admin.api")


def _validate_hospital_scope(ctx: RequestContext) -> int:
    """
    Validate hospital admin has hospital scope.
    
    Required Headers:
        X-Role: hospital_admin
        X-Hospital-ID: <integer>
    
    Used by AMB integration to ensure correct headers are passed.
    """
    if not ctx.hospital_id:
        logger.warning(
            f"RBAC validation failed: X-Hospital-ID header missing. "
            f"Role={ctx.role.value}. Required for hospital-scoped operations."
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "missing_hospital_scope",
                "message": "X-Hospital-ID header is required for Hospital Admin operations",
                "required_headers": {
                    "X-Role": "hospital_admin",
                    "X-Hospital-ID": "<integer hospital ID>"
                },
                "hint": "Ensure both X-Role and X-Hospital-ID headers are set correctly."
            },
        )
    return ctx.hospital_id


# ─────────────────────────────────────────────────────────────────────────────
# Ward Capacity Management
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/wards",
    response_model=WardStatusResponse,
    summary="Get ward status",
    description="Read-only view of ward capacity and occupancy. Hospital Admin only.",
)
async def get_wards(
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN)),
) -> WardStatusResponse:
    """
    Get current ward status for the hospital.
    
    Returns read-only ward capacity and occupancy information.
    Use PATCH /api/hospital/wards to modify capacities.
    
    Required Headers:
        X-Role: hospital_admin
        X-Hospital-ID: <integer>
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = HospitalAdminService(session)
    return await service.get_wards(hospital_id)


@router.patch(
    "/wards",
    response_model=WardCapacityUpdateResponse,
    summary="Update ward capacities",
    description="Modify ward capacity (ICU / HDU / GENERAL). Hospital Admin only.",
)
async def update_ward_capacity(
    request: WardCapacityUpdateRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN)),
) -> WardCapacityUpdateResponse:
    """
    Update ward capacities for the hospital.
    
    Rules:
    - Hospital Admin can only update their own hospital
    - Capacity reduction must NOT cause occupancy > capacity
    - Emits hospital.capacity.updated event for each ward
    
    Example request:
    ```json
    {
        "wards": [
            {"ward_type": "icu", "new_capacity": 20},
            {"ward_type": "general", "new_capacity": 100}
        ],
        "reason": "Expanding ICU capacity for winter surge"
    }
    ```
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = HospitalAdminService(session)
    return await service.update_ward_capacity(hospital_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Waste Prediction
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/waste/prediction",
    response_model=WastePrediction,
    summary="Get waste prediction",
    description="View predicted medical waste based on current occupancy and ward types.",
)
async def get_waste_prediction(
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN)),
) -> WastePrediction:
    """
    Get waste prediction for the hospital.
    
    Prediction is rule-based:
    - ICU beds: ~8 kg/day
    - HDU beds: ~5 kg/day
    - General beds: ~2.5 kg/day
    
    Returns:
    - Current waste level and alert status
    - Daily and weekly predictions
    - Days until warning/critical thresholds
    - Collection recommendation
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = HospitalAdminService(session)
    return await service.get_waste_prediction(hospital_id)


@router.get(
    "/waste/comparison",
    response_model=WasteComparison,
    summary="Compare actual vs predicted waste",
    description="Compare actual waste accumulation against predictions.",
)
async def compare_waste(
    period_days: int = Query(7, ge=1, le=30, description="Period for comparison in days"),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN)),
) -> WasteComparison:
    """
    Compare actual vs predicted waste.
    
    Returns:
    - Actual waste accumulated
    - Predicted waste for period
    - Variance (kg and percentage)
    - Assessment: on_track, above_predicted, below_predicted
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = HospitalAdminService(session)
    return await service.compare_waste(hospital_id, period_days)


# ─────────────────────────────────────────────────────────────────────────────
# Waste Pickup Request
# ─────────────────────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────────────────────
# Waste Pickup Request
#
# INTEGRATION NOTE (for AMB and external systems):
# The canonical endpoint for requesting waste pickup is:
#     POST /api/hospital/waste/request-pickup
#
# Do NOT use alternative paths. This is the system of record.
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/waste/request-pickup",
    response_model=PickupRequestResponse,
    summary="Request waste pickup",
    description=(
        "Submit a waste pickup request to the waste management team. "
        "Canonical path: POST /api/hospital/waste/request-pickup"
    ),
)
async def request_waste_pickup(
    request: PickupRequestCreate,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.HOSPITAL_ADMIN)),
) -> PickupRequestResponse:
    """
    Request a waste pickup.
    
    CANONICAL ENDPOINT: POST /api/hospital/waste/request-pickup
    
    - Creates a pickup request
    - Notifies WASTE_TEAM via notification system
    - Emits waste.pickup.requested event
    
    Required Headers:
        X-Role: hospital_admin
        X-Hospital-ID: <integer>
    
    Urgency levels:
    - normal: Routine collection
    - urgent: Collection needed soon
    - critical: Immediate collection required
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = HospitalAdminService(session)
    return await service.request_pickup(hospital_id, request, ctx)
