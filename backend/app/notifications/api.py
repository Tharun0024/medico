"""
Notification API Endpoints

REST API for notification management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.core.rbac import get_current_context, RequestContext
from app.notifications.schemas import (
    NotificationList,
    NotificationResponse,
    NotificationReadResponse,
)
from app.notifications.service import NotificationService


router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_notification_service(
    session: AsyncSession = Depends(get_db),
) -> NotificationService:
    """Dependency for notification service."""
    return NotificationService(session)


@router.get(
    "",
    response_model=NotificationList,
    summary="List notifications",
    description="Get notifications for the current user's role and scope.",
)
async def list_notifications(
    limit: int = Query(50, ge=1, le=100, description="Maximum notifications to return"),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    ctx: RequestContext = Depends(get_current_context),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationList:
    """
    List notifications for the authenticated user.
    
    Notifications are filtered by:
    - User's role (X-Role header)
    - User's hospital scope (X-Hospital-ID header) if applicable
    
    Returns notifications sorted by creation time (newest first).
    """
    return await service.list_notifications(
        ctx=ctx,
        limit=limit,
        unread_only=unread_only,
    )


@router.post(
    "/{notification_id}/read",
    response_model=NotificationReadResponse,
    summary="Mark notification as read",
    description="Mark a specific notification as read.",
)
async def mark_notification_read(
    notification_id: int,
    ctx: RequestContext = Depends(get_current_context),
    service: NotificationService = Depends(get_notification_service),
) -> NotificationReadResponse:
    """
    Mark a notification as read.
    
    The notification must belong to the user's role and scope.
    If already read, returns the existing read timestamp.
    """
    notification = await service.mark_as_read(notification_id, ctx)
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or access denied",
        )
    
    return NotificationReadResponse(
        id=notification.id,
        read_at=notification.read_at,
        message="Notification marked as read",
    )
