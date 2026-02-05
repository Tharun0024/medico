"""
Waste Team API - Phase 2

Endpoints for Waste Team operations:
- View pickup requests
- Mark waste as collected
- Mark waste as disposed
- Record payment
- View disposal logs
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.core.rbac import RequestContext, require_role, UserRole
from app.api.waste_team.service import WasteTeamService
from app.api.waste_team.schemas import (
    PickupRequestList,
    CollectRequest,
    CollectResponse,
    DisposeRequest,
    DisposeResponse,
    PaymentRequest,
    PaymentResponse,
    DisposalLogList,
)


router = APIRouter(
    prefix="/api/waste",
    tags=["waste-team"],
)


# ─────────────────────────────────────────────────────────────────────────────
# View Pickup Requests
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/requests",
    response_model=PickupRequestList,
    summary="View pickup requests",
    description="List all waste pickup requests from hospitals. Waste Team only.",
)
async def list_pickup_requests(
    status_filter: Optional[str] = Query(
        None, 
        alias="status",
        pattern="^(requested|collected|disposed|paid)$",
        description="Filter by status"
    ),
    hospital_id: Optional[int] = Query(None, description="Filter by hospital ID"),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM, UserRole.SUPER_ADMIN)),
) -> PickupRequestList:
    """
    List all pickup requests.
    
    State machine: REQUESTED → COLLECTED → DISPOSED → PAID
    
    Filters:
    - status: Filter by request status
    - hospital_id: Filter by hospital
    
    Sorted by urgency (critical first) then request time.
    """
    service = WasteTeamService(session)
    return await service.list_pickup_requests(status_filter, hospital_id)


# ─────────────────────────────────────────────────────────────────────────────
# Mark as Collected
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/collect",
    response_model=CollectResponse,
    summary="Mark waste as collected",
    description="Mark a pickup request as collected. State: REQUESTED → COLLECTED.",
)
async def collect_waste(
    request_id: str = Query(..., description="Pickup request ID"),
    request: CollectRequest = ...,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM)),
) -> CollectResponse:
    """
    Mark waste as collected.
    
    - Validates state is REQUESTED
    - Records actual collected weight
    - Resets hospital waste level
    - Creates immutable disposal log
    - Emits waste.collected event
    - Notifies hospital admin
    """
    service = WasteTeamService(session)
    return await service.collect_waste(request_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Mark as Disposed
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/dispose",
    response_model=DisposeResponse,
    summary="Mark waste as disposed",
    description="Mark a pickup request as disposed. State: COLLECTED → DISPOSED.",
)
async def dispose_waste(
    request_id: str = Query(..., description="Pickup request ID"),
    request: DisposeRequest = ...,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM)),
) -> DisposeResponse:
    """
    Mark waste as disposed.
    
    - Validates state is COLLECTED
    - Validates disposal weight ≤ collected + 20% tolerance
    - Records disposal method and facility
    - Creates immutable disposal log
    - Emits waste.disposed event
    - Notifies hospital admin
    """
    service = WasteTeamService(session)
    return await service.dispose_waste(request_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Record Payment
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/payment",
    response_model=PaymentResponse,
    summary="Record payment received",
    description="Record payment for disposed waste. State: DISPOSED → PAID.",
)
async def record_payment(
    request_id: str = Query(..., description="Pickup request ID"),
    request: PaymentRequest = ...,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM)),
) -> PaymentResponse:
    """
    Record payment received.
    
    - Validates state is DISPOSED
    - Records payment amount and reference
    - Creates immutable disposal log
    - Emits waste.payment.completed event
    """
    service = WasteTeamService(session)
    return await service.record_payment(request_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Disposal Logs
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/logs",
    response_model=DisposalLogList,
    summary="View disposal logs",
    description="View immutable disposal logs for audit. Waste Team only.",
)
async def get_disposal_logs(
    request_id: Optional[str] = Query(None, description="Filter by request ID"),
    hospital_id: Optional[int] = Query(None, description="Filter by hospital ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum logs to return"),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM, UserRole.SUPER_ADMIN)),
) -> DisposalLogList:
    """
    Get disposal logs.
    
    Logs are immutable records of all waste operations:
    - Collection with weight
    - Disposal with method and facility
    - Payment with amount and reference
    
    All entries include who performed the action and when.
    """
    service = WasteTeamService(session)
    return await service.get_disposal_logs(request_id, hospital_id, limit)
