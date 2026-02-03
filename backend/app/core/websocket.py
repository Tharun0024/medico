"""
MEDICO WebSocket Manager

Handles WebSocket connections for real-time updates.
Broadcasts internal events to connected dashboard clients.
"""

import logging
from typing import Dict, Set
from fastapi import WebSocket


logger = logging.getLogger("medico.websocket")


class ConnectionManager:
    """Manages active WebSocket connections."""

    def __init__(self):
        # Map of channel -> set of connections
        self._connections: Dict[str, Set[WebSocket]] = {}
        # All active connections
        self._active: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, channel: str = "default") -> None:
        """Accept and register a WebSocket connection."""
        await websocket.accept()
        self._active.add(websocket)

        if channel not in self._connections:
            self._connections[channel] = set()
        self._connections[channel].add(websocket)
        
        logger.info(
            f"WebSocket connected (channel: {channel}, "
            f"total: {self.active_count})"
        )

    def disconnect(self, websocket: WebSocket, channel: str = "default") -> None:
        """Remove a WebSocket connection."""
        was_active = websocket in self._active
        self._active.discard(websocket)

        if channel in self._connections:
            self._connections[channel].discard(websocket)
            if not self._connections[channel]:
                del self._connections[channel]
        
        if was_active:
            logger.info(
                f"WebSocket disconnected (channel: {channel}, "
                f"remaining: {self.active_count})"
            )

    async def broadcast(self, message: dict, channel: str = "default") -> None:
        """Broadcast a message to all connections in a channel."""
        if channel not in self._connections:
            return

        dead_connections = set()
        for connection in self._connections[channel]:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self.disconnect(conn, channel)

    async def broadcast_all(self, message: dict) -> None:
        """Broadcast a message to ALL active connections across all channels."""
        if not self._active:
            return

        dead_connections = set()
        for connection in self._active:
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        # Clean up dead connections
        for conn in dead_connections:
            self._active.discard(conn)
            # Remove from all channels
            for channel_conns in self._connections.values():
                channel_conns.discard(conn)

    async def send_personal(self, websocket: WebSocket, message: dict) -> None:
        """Send a message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception:
            self.disconnect(websocket)

    @property
    def active_count(self) -> int:
        """Number of active connections."""
        return len(self._active)


# Global connection manager instance
manager = ConnectionManager()


async def broadcast_event_handler(event) -> None:
    """
    Event handler that broadcasts events to all WebSocket clients.
    
    This function is subscribed to all events on the event bus
    and forwards them to connected dashboard clients.
    """
    try:
        await manager.broadcast_all(event.to_dict())
    except Exception as e:
        logger.error(f"Failed to broadcast event: {e}")


def setup_websocket_broadcasting() -> None:
    """
    Subscribe the WebSocket broadcaster to all events.
    
    Call this during application startup.
    """
    from app.core.event_bus import event_bus
    
    event_bus.subscribe_all(broadcast_event_handler)
    logger.info("WebSocket broadcasting subscribed to all events")
