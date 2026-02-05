"""
Notification Events

Event definitions for the notification system.
"""

from app.core.event_bus import EventType, emit_event
from app.notifications.models import Notification


def emit_notification_created(notification: Notification) -> None:
    """
    Emit event when a notification is created.
    
    This will be broadcast via WebSocket to relevant dashboards.
    """
    emit_event(
        EventType.NOTIFICATION_CREATED,
        {
            "notification_id": notification.id,
            "recipient_role": notification.recipient_role,
            "recipient_scope": notification.recipient_scope,
            "title": notification.title,
            "message": notification.message,
            "severity": notification.severity.value,
            "created_at": notification.created_at.isoformat(),
        }
    )


def emit_notification_read(notification: Notification) -> None:
    """
    Emit event when a notification is marked as read.
    """
    emit_event(
        EventType.NOTIFICATION_READ,
        {
            "notification_id": notification.id,
            "recipient_role": notification.recipient_role,
            "recipient_scope": notification.recipient_scope,
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
        }
    )
