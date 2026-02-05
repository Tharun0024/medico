"""
Notification Models

SQLAlchemy models for the notification system.
"""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class NotificationSeverity(str, enum.Enum):
    """Notification severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class Notification(Base):
    """
    Notification model for internal alerts and communications.
    
    Notifications are role-scoped and optionally hospital-scoped.
    They are internal only (no email/SMS).
    """
    
    __tablename__ = "notifications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    
    # Recipient targeting
    recipient_role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    recipient_scope: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True, index=True,
        comment="Hospital ID for hospital-scoped notifications, NULL for all"
    )
    
    # Content
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[NotificationSeverity] = mapped_column(
        SQLEnum(NotificationSeverity), 
        nullable=False, 
        default=NotificationSeverity.INFO
    )
    
    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.utcnow
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Actor info for audit trail
    created_by_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    created_by_hospital: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, title='{self.title[:30]}...', severity={self.severity.value})>"
    
    @property
    def is_read(self) -> bool:
        """Check if notification has been read."""
        return self.read_at is not None
