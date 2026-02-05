"""
Notification Service

Business logic for notification management.
"""

import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.notifications.models import Notification, NotificationSeverity
from app.notifications.schemas import NotificationCreate, NotificationResponse, NotificationList
from app.notifications.events import emit_notification_created, emit_notification_read
from app.core.rbac import RequestContext


logger = logging.getLogger("medico.notifications")


class NotificationService:
    """
    Service for managing notifications.
    
    Handles creation, retrieval, and read status updates.
    All operations emit events for real-time broadcasting.
    """
    
    def __init__(self, session: AsyncSession):
        self._session = session
    
    async def create_notification(
        self, 
        data: NotificationCreate,
        actor: Optional[RequestContext] = None,
    ) -> Notification:
        """
        Create a new notification.
        
        Args:
            data: Notification data
            actor: Request context of the creator (for audit)
        
        Returns:
            Created notification
        """
        notification = Notification(
            recipient_role=data.recipient_role,
            recipient_scope=data.recipient_scope,
            title=data.title,
            message=data.message,
            severity=data.severity,
            created_at=datetime.utcnow(),
            created_by_role=actor.role.value if actor else None,
            created_by_hospital=actor.hospital_id if actor else None,
        )
        
        self._session.add(notification)
        await self._session.commit()
        await self._session.refresh(notification)
        
        logger.info(
            f"Notification created: id={notification.id}, "
            f"role={notification.recipient_role}, severity={notification.severity.value}"
        )
        
        # Emit event for WebSocket broadcast
        emit_notification_created(notification)
        
        return notification
    
    async def list_notifications(
        self,
        ctx: RequestContext,
        limit: int = 50,
        unread_only: bool = False,
    ) -> NotificationList:
        """
        List notifications for the current user's role and scope.
        
        Notifications are filtered by:
        - recipient_role matches user's role
        - recipient_scope is NULL (broadcast) OR matches user's hospital
        
        Args:
            ctx: Request context with role and hospital scope
            limit: Maximum notifications to return
            unread_only: If True, only return unread notifications
        
        Returns:
            List of notifications with counts
        """
        # Build filter conditions
        role_filter = Notification.recipient_role == ctx.role.value
        
        # Scope filter: NULL (all) OR matching hospital_id
        if ctx.hospital_id:
            scope_filter = or_(
                Notification.recipient_scope.is_(None),
                Notification.recipient_scope == ctx.hospital_id
            )
        else:
            # Super admin and emergency services see all
            scope_filter = Notification.recipient_scope.is_(None)
        
        base_filter = and_(role_filter, scope_filter)
        
        # Query notifications
        query = select(Notification).where(base_filter).order_by(
            Notification.created_at.desc()
        )
        
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
        
        query = query.limit(limit)
        
        result = await self._session.execute(query)
        notifications = result.scalars().all()
        
        # Count total and unread
        total_result = await self._session.execute(
            select(func.count(Notification.id)).where(base_filter)
        )
        total = total_result.scalar_one()
        
        unread_result = await self._session.execute(
            select(func.count(Notification.id)).where(
                and_(base_filter, Notification.read_at.is_(None))
            )
        )
        unread_count = unread_result.scalar_one()
        
        return NotificationList(
            items=[
                NotificationResponse(
                    id=n.id,
                    recipient_role=n.recipient_role,
                    recipient_scope=n.recipient_scope,
                    title=n.title,
                    message=n.message,
                    severity=n.severity,
                    created_at=n.created_at,
                    read_at=n.read_at,
                    is_read=n.is_read,
                    created_by_role=n.created_by_role,
                    created_by_hospital=n.created_by_hospital,
                )
                for n in notifications
            ],
            total=total,
            unread_count=unread_count,
        )
    
    async def mark_as_read(
        self,
        notification_id: int,
        ctx: RequestContext,
    ) -> Optional[Notification]:
        """
        Mark a notification as read.
        
        Only the recipient can mark their notification as read.
        
        Args:
            notification_id: ID of notification to mark
            ctx: Request context for authorization
        
        Returns:
            Updated notification or None if not found/authorized
        """
        # Fetch notification
        result = await self._session.execute(
            select(Notification).where(Notification.id == notification_id)
        )
        notification = result.scalar_one_or_none()
        
        if not notification:
            return None
        
        # Check authorization
        if notification.recipient_role != ctx.role.value:
            logger.warning(
                f"Unauthorized read attempt: notification {notification_id} "
                f"by role {ctx.role.value}"
            )
            return None
        
        # Check scope if applicable
        if notification.recipient_scope and ctx.hospital_id:
            if notification.recipient_scope != ctx.hospital_id:
                return None
        
        # Already read?
        if notification.is_read:
            return notification
        
        # Mark as read
        notification.read_at = datetime.utcnow()
        await self._session.commit()
        await self._session.refresh(notification)
        
        logger.info(f"Notification {notification_id} marked as read")
        
        # Emit event
        emit_notification_read(notification)
        
        return notification
    
    async def create_system_alert(
        self,
        recipient_role: str,
        title: str,
        message: str,
        severity: NotificationSeverity = NotificationSeverity.INFO,
        hospital_id: Optional[int] = None,
    ) -> Notification:
        """
        Create a system-generated alert notification.
        
        This is a convenience method for automated alerts.
        
        Args:
            recipient_role: Target role
            title: Alert title
            message: Alert message
            severity: Alert severity level
            hospital_id: Optional hospital scope
        
        Returns:
            Created notification
        """
        data = NotificationCreate(
            recipient_role=recipient_role,
            recipient_scope=hospital_id,
            title=title,
            message=message,
            severity=severity,
        )
        return await self.create_notification(data, actor=None)
