"""
Waste Dashboard API Endpoints

REST API for Waste Management Team dashboard.
Task-based operational view for waste collection.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.rbac import require_role, UserRole, RequestContext
from app.api.schemas.waste_dashboard import (
    TaskStatus,
    WasteDashboard,
    WasteTaskList,
    TaskCompleteRequest,
    TaskCompleteResponse,
)
from app.api.services.waste_dashboard_service import WasteDashboardService

router = APIRouter(prefix="/waste", tags=["Waste Management"])


def get_waste_service(session: AsyncSession = Depends(get_db)) -> WasteDashboardService:
    """Dependency for waste dashboard service."""
    return WasteDashboardService(session)


@router.get(
    "/dashboard",
    response_model=WasteDashboard,
    summary="Waste management dashboard",
    description="System-wide waste status for all hospitals. Waste Team only.",
)
async def get_waste_dashboard(
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM, UserRole.SUPER_ADMIN)),
    service: WasteDashboardService = Depends(get_waste_service),
) -> WasteDashboard:
    """
    Get waste management dashboard.

    Returns:
    - Summary counts by alert level
    - Per-hospital waste status
    - Collection requirements
    """
    return await service.get_dashboard()


@router.get(
    "/tasks",
    response_model=WasteTaskList,
    summary="Waste collection tasks",
    description="List of waste collection tasks. Waste Team only.",
)
async def get_waste_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    hospital_id: Optional[int] = Query(None),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM, UserRole.SUPER_ADMIN)),
    service: WasteDashboardService = Depends(get_waste_service),
) -> WasteTaskList:
    """
    Get list of waste collection tasks.

    Filters:
    - status: Filter by task status (pending, in_progress, completed)
    - hospital_id: Filter by hospital
    
    Sorted by priority (critical first) then creation time.
    """
    return await service.get_tasks(status_filter=status_filter, hospital_id=hospital_id)


@router.post(
    "/tasks/{task_id}/complete",
    response_model=TaskCompleteResponse,
    summary="Complete waste collection task",
    description="Mark a waste collection task as completed. Waste Team only.",
)
async def complete_waste_task(
    task_id: str,
    request: TaskCompleteRequest = TaskCompleteRequest(),
    ctx: RequestContext = Depends(require_role(UserRole.WASTE_TEAM)),
    service: WasteDashboardService = Depends(get_waste_service),
) -> TaskCompleteResponse:
    """
    Complete a waste collection task.

    Actions:
    - Marks task as completed
    - Resets hospital waste level
    - Emits waste.collected event
    """
    return await service.complete_task(task_id, request.collected_kg)
