"""
Notification Schemas

Pydantic models for notification request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

from app.notifications.models import NotificationSeverity


class NotificationCreate(BaseModel):
    """Schema for creating a new notification."""
    
    recipient_role: str = Field(
        ..., 
        description="Target role (super_admin, hospital_admin, medical_staff, waste_team, emergency_service)"
    )
    recipient_scope: Optional[int] = Field(
        None, 
        description="Hospital ID for scoped notifications, null for broadcast to role"
    )
    title: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1)
    severity: NotificationSeverity = Field(default=NotificationSeverity.INFO)


class NotificationResponse(BaseModel):
    """Schema for notification responses."""
    
    id: int
    recipient_role: str
    recipient_scope: Optional[int]
    title: str
    message: str
    severity: NotificationSeverity
    created_at: datetime
    read_at: Optional[datetime]
    is_read: bool
    created_by_role: Optional[str]
    created_by_hospital: Optional[int]
    
    model_config = ConfigDict(from_attributes=True)


class NotificationList(BaseModel):
    """Schema for list of notifications."""
    
    items: List[NotificationResponse]
    total: int
    unread_count: int


class NotificationReadResponse(BaseModel):
    """Response after marking notification as read."""
    
    id: int
    read_at: datetime
    message: str = "Notification marked as read"
