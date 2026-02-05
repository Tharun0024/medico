"""
MEDICO Notification & Alert Engine

Internal notification system for operational alerts and communications.
"""

from app.notifications.models import Notification, NotificationSeverity
from app.notifications.service import NotificationService
from app.notifications.api import router as notifications_router

__all__ = [
    "Notification",
    "NotificationSeverity",
    "NotificationService",
    "notifications_router",
]
