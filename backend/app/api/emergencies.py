"""
Emergency API Endpoints

REST API for emergency case management.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.modules.emergencies.models import EmergencySeverity, EmergencyStatus
from app.modules.emergencies.schemas import (
    EmergencyCreate,
    EmergencyResponse,
    EmergencyList,
    AssignmentResult,
    HospitalCandidate,
)
from app.modules.emergencies.orchestrator import EmergencyOrchestrator

router = APIRouter(prefix="/emergencies", tags=["Emergencies"])


def get_orchestrator(session: AsyncSession = Depends(get_db)) -> EmergencyOrchestrator:
    """Dependency for emergency orchestrator."""
    return EmergencyOrchestrator(session)


@router.post(
    "",
    response_model=EmergencyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create emergency case",
)
async def create_emergency(
    data: EmergencyCreate,
    orchestrator: EmergencyOrchestrator = Depends(get_orchestrator),
) -> EmergencyResponse:
    """
    Create a new emergency case.

    - **severity**: CRITICAL, HIGH, or NORMAL
    - **description**: Optional description of the emergency
    """
    return await orchestrator.create_emergency(data)


@router.post(
    "/{emergency_id}/assign",
    response_model=AssignmentResult,
    summary="Assign hospital to emergency",
)
async def assign_hospital(
    emergency_id: int,
    orchestrator: EmergencyOrchestrator = Depends(get_orchestrator),
) -> AssignmentResult:
    """
    Assign a hospital to an emergency case.

    The orchestrator will:
    1. Find hospitals with available beds matching severity requirements
    2. Rank by available capacity
    3. Assign the best match
    4. Reserve a bed

    CRITICAL → ICU only
    HIGH → ICU or HDU
    NORMAL → HDU or General
    """
    return await orchestrator.assign_hospital(emergency_id)


@router.post(
    "/{emergency_id}/resolve",
    response_model=EmergencyResponse,
    summary="Resolve emergency case",
)
async def resolve_emergency(
    emergency_id: int,
    orchestrator: EmergencyOrchestrator = Depends(get_orchestrator),
) -> EmergencyResponse:
    """
    Mark an emergency as resolved and release the reserved bed.
    """
    return await orchestrator.resolve_emergency(emergency_id)


@router.get(
    "",
    response_model=EmergencyList,
    summary="List emergency cases",
)
async def list_emergencies(
    status_filter: Optional[EmergencyStatus] = Query(None, alias="status"),
    skip: int = 0,
    limit: int = 100,
    orchestrator: EmergencyOrchestrator = Depends(get_orchestrator),
) -> EmergencyList:
    """
    List all emergency cases with optional status filter.
    """
    return await orchestrator.list_emergencies(status_filter, skip, limit)


@router.get(
    "/candidates/{severity}",
    response_model=list[HospitalCandidate],
    summary="Get hospital candidates",
)
async def get_candidates(
    severity: EmergencySeverity,
    orchestrator: EmergencyOrchestrator = Depends(get_orchestrator),
) -> list[HospitalCandidate]:
    """
    Get ranked hospital candidates for a given severity level.

    Useful for previewing assignment options before creating an emergency.
    """
    return await orchestrator.get_candidates(severity)
