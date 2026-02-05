"""
Control Room API

Phase-2 endpoints for control room operations:
- Manual hospital assignment for emergencies
- Reassignment with bed release
- Response/resolution metrics
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.core.rbac import RequestContext, get_current_context, require_role, UserRole
from app.api.control_room.service import ControlRoomService
from app.api.control_room.schemas import (
    ManualAssignRequest,
    ReassignRequest,
    AssignmentResponse,
    ControlRoomMetrics,
    HospitalLoadList,
)


router = APIRouter(
    prefix="/api/control",
    tags=["control-room"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Manual Assignment
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/emergencies/{emergency_id}/assign-hospital",
    response_model=AssignmentResponse,
    summary="Manually assign emergency to hospital",
    description="Control room operator manually assigns a pending emergency to a specific hospital. "
                "Validates bed availability and reserves a bed.",
)
async def assign_emergency_to_hospital(
    emergency_id: int,
    request: ManualAssignRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.CONTROL_ROOM, UserRole.SUPER_ADMIN)),
) -> AssignmentResponse:
    """
    Manually assign an emergency to a hospital.
    
    - Validates emergency is in PENDING status
    - Validates hospital is active
    - Validates bed availability in specified bed group
    - Reserves the bed
    - Emits events and creates notifications
    """
    service = ControlRoomService(session)
    return await service.assign_emergency_to_hospital(emergency_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Reassignment
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/emergencies/{emergency_id}/reassign",
    response_model=AssignmentResponse,
    summary="Reassign emergency to different hospital",
    description="Control room operator reassigns an emergency from one hospital to another. "
                "Releases the bed at the original hospital and reserves at the new one.",
)
async def reassign_emergency(
    emergency_id: int,
    request: ReassignRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.CONTROL_ROOM, UserRole.SUPER_ADMIN)),
) -> AssignmentResponse:
    """
    Reassign an emergency to a different hospital.
    
    - Validates emergency is currently ASSIGNED
    - Releases bed at original hospital
    - Validates and reserves bed at new hospital
    - Emits events and notifies both hospitals
    """
    service = ControlRoomService(session)
    return await service.reassign_emergency(emergency_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Metrics
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/metrics",
    response_model=ControlRoomMetrics,
    summary="Get control room metrics",
    description="Get emergency response and resolution metrics for the control room dashboard.",
)
async def get_control_room_metrics(
    from_date: Optional[datetime] = Query(None, description="Start of metrics period"),
    to_date: Optional[datetime] = Query(None, description="End of metrics period"),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(
        UserRole.CONTROL_ROOM, 
        UserRole.SUPER_ADMIN, 
        UserRole.EMERGENCY_SERVICE
    )),
) -> ControlRoomMetrics:
    """
    Get control room metrics.
    
    Returns:
    - Total counts by status
    - Average response time (created → assigned)
    - Average resolution time (created → resolved)
    - Breakdown by severity
    """
    service = ControlRoomService(session)
    return await service.get_metrics(from_date, to_date)


@router.get(
    "/hospital-loads",
    response_model=HospitalLoadList,
    summary="Get hospital load metrics",
    description="Get current load metrics for all active hospitals to aid assignment decisions.",
)
async def get_hospital_loads(
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(
        UserRole.CONTROL_ROOM, 
        UserRole.SUPER_ADMIN, 
        UserRole.EMERGENCY_SERVICE
    )),
) -> HospitalLoadList:
    """
    Get hospital load metrics.
    
    Returns for each active hospital:
    - Active emergency count
    - Available beds by ward type
    - Total occupancy percentage
    """
    service = ControlRoomService(session)
    return await service.get_hospital_loads()
