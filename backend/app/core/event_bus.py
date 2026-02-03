"""
MEDICO Event Bus

Simple in-memory pub/sub event bus for internal event distribution.
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Coroutine, Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger("medico.events")


class EventType(str, Enum):
    """Enumeration of all event types in MEDICO."""
    
    # Emergency events
    EMERGENCY_CREATED = "emergency.created"
    EMERGENCY_ASSIGNED = "emergency.assigned"
    EMERGENCY_RESOLVED = "emergency.resolved"
    EMERGENCY_FAILED = "emergency.failed"
    
    # Bed events
    BED_RESERVED = "bed.reserved"
    BED_RELEASED = "bed.released"
    BED_OCCUPANCY_UPDATED = "bed.occupancy.updated"
    
    # Hospital events (for future use)
    HOSPITAL_REGISTERED = "hospital.registered"
    HOSPITAL_UPDATED = "hospital.updated"
    
    # Waste events
    WASTE_GENERATED = "waste.generated"
    WASTE_THRESHOLD_WARNING = "waste.threshold.warning"
    WASTE_THRESHOLD_CRITICAL = "waste.threshold.critical"
    WASTE_COLLECTED = "waste.collected"


@dataclass
class Event:
    """Base event structure."""
    
    type: EventType
    payload: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)
    event_id: Optional[str] = None
    
    def __post_init__(self):
        if self.event_id is None:
            self.event_id = f"{self.type.value}_{self.timestamp.timestamp()}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary."""
        return {
            "event_id": self.event_id,
            "type": self.type.value,
            "payload": self.payload,
            "timestamp": self.timestamp.isoformat(),
        }


# Type alias for event handlers
EventHandler = Callable[[Event], Coroutine[Any, Any, None]]


class EventBus:
    """
    In-memory event bus for internal event distribution.
    
    Features:
    - Async event emission
    - Multiple subscribers per event type
    - Fire-and-forget emission (failures don't block)
    - Event logging
    """
    
    def __init__(self):
        self._handlers: Dict[EventType, List[EventHandler]] = {}
        self._all_handlers: List[EventHandler] = []  # Handlers for all events
    
    def subscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Subscribe a handler to a specific event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
        logger.debug(f"Handler subscribed to {event_type.value}")
    
    def subscribe_all(self, handler: EventHandler) -> None:
        """Subscribe a handler to all events."""
        self._all_handlers.append(handler)
        logger.debug("Handler subscribed to all events")
    
    def unsubscribe(self, event_type: EventType, handler: EventHandler) -> None:
        """Unsubscribe a handler from an event type."""
        if event_type in self._handlers:
            try:
                self._handlers[event_type].remove(handler)
            except ValueError:
                pass
    
    async def emit(self, event: Event) -> None:
        """
        Emit an event to all subscribed handlers.
        
        This is fire-and-forget: handler failures are logged but don't
        affect the caller or other handlers.
        """
        logger.info(
            f"Event emitted: {event.type.value}",
            extra={"event": event.to_dict()}
        )
        
        # Collect all relevant handlers
        handlers = list(self._all_handlers)
        if event.type in self._handlers:
            handlers.extend(self._handlers[event.type])
        
        if not handlers:
            return
        
        # Execute handlers concurrently, catching individual failures
        async def safe_handle(handler: EventHandler) -> None:
            try:
                await handler(event)
            except Exception as e:
                logger.error(
                    f"Event handler failed for {event.type.value}: {e}",
                    exc_info=True
                )
        
        await asyncio.gather(*[safe_handle(h) for h in handlers])
    
    def emit_nowait(self, event: Event) -> None:
        """
        Emit an event without waiting for handlers to complete.
        
        Use this when you don't want to await handler execution.
        """
        logger.info(
            f"Event emitted (nowait): {event.type.value}",
            extra={"event": event.to_dict()}
        )
        
        # Schedule emission as a background task
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.emit(event))
        except RuntimeError:
            # No running loop, log and skip
            logger.warning(f"No event loop available for {event.type.value}")


# Global event bus instance
event_bus = EventBus()


# Convenience functions for emitting events
def emit_event(event_type: EventType, payload: Dict[str, Any]) -> None:
    """Fire-and-forget event emission."""
    event = Event(type=event_type, payload=payload)
    event_bus.emit_nowait(event)


async def emit_event_async(event_type: EventType, payload: Dict[str, Any]) -> None:
    """Async event emission with handler completion."""
    event = Event(type=event_type, payload=payload)
    await event_bus.emit(event)
