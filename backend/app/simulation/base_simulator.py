"""
Base Simulator

Abstract base class for all MEDICO simulators.
Provides common functionality for background task management.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime


logger = logging.getLogger("medico.simulation")


class BaseSimulator(ABC):
    """
    Base class for all simulators.
    
    Provides:
    - Start/stop lifecycle management
    - Configurable interval
    - Error handling with backoff
    - Graceful shutdown
    """

    def __init__(
        self,
        name: str,
        interval_seconds: float = 5.0,
        enabled: bool = True,
    ):
        self.name = name
        self.interval_seconds = interval_seconds
        self.enabled = enabled
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._error_count = 0
        self._max_errors = 5
        self._backoff_seconds = 1.0

    @abstractmethod
    async def tick(self) -> None:
        """
        Execute one simulation cycle.
        
        Subclasses must implement this method with their
        specific simulation logic.
        """
        pass

    async def start(self) -> None:
        """Start the simulator background task."""
        if not self.enabled:
            logger.info(f"Simulator '{self.name}' is disabled, skipping start")
            return

        if self._running:
            logger.warning(f"Simulator '{self.name}' is already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(f"Simulator '{self.name}' started (interval: {self.interval_seconds}s)")

    async def stop(self) -> None:
        """Stop the simulator gracefully."""
        if not self._running:
            return

        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None
        logger.info(f"Simulator '{self.name}' stopped")

    async def _run_loop(self) -> None:
        """Main simulation loop with error handling."""
        while self._running:
            try:
                await self.tick()
                self._error_count = 0  # Reset on success
                await asyncio.sleep(self.interval_seconds)

            except asyncio.CancelledError:
                break

            except Exception as e:
                self._error_count += 1
                logger.error(
                    f"Simulator '{self.name}' error ({self._error_count}/{self._max_errors}): {e}",
                    exc_info=True
                )

                if self._error_count >= self._max_errors:
                    logger.critical(
                        f"Simulator '{self.name}' exceeded max errors, stopping"
                    )
                    self._running = False
                    break

                # Exponential backoff
                backoff = self._backoff_seconds * (2 ** (self._error_count - 1))
                await asyncio.sleep(min(backoff, 30))

    @property
    def is_running(self) -> bool:
        """Check if simulator is running."""
        return self._running

    def __repr__(self) -> str:
        status = "running" if self._running else "stopped"
        return f"<{self.__class__.__name__}(name='{self.name}', status={status})>"


class SimulationManager:
    """
    Manages multiple simulators.
    
    Provides centralized start/stop for all simulation components.
    Tracks runtime state for API exposure.
    """

    def __init__(self):
        self._simulators: list[BaseSimulator] = []
        self._is_running: bool = False
        self._last_started_at: Optional[datetime] = None
        self._last_stopped_at: Optional[datetime] = None

    def register(self, simulator: BaseSimulator) -> None:
        """Register a simulator."""
        self._simulators.append(simulator)
        logger.debug(f"Registered simulator: {simulator.name}")

    async def start_all(self) -> None:
        """Start all registered simulators."""
        logger.info(f"Starting {len(self._simulators)} simulators...")
        for sim in self._simulators:
            await sim.start()
        self._is_running = True
        self._last_started_at = datetime.utcnow()

    async def stop_all(self) -> None:
        """Stop all registered simulators."""
        logger.info("Stopping all simulators...")
        for sim in self._simulators:
            await sim.stop()
        self._is_running = False
        self._last_stopped_at = datetime.utcnow()

    @property
    def is_running(self) -> bool:
        """Check if simulation is running."""
        return self._is_running
    
    @property
    def last_started_at(self) -> Optional[datetime]:
        """Get timestamp of last start."""
        return self._last_started_at
    
    @property
    def last_stopped_at(self) -> Optional[datetime]:
        """Get timestamp of last stop."""
        return self._last_stopped_at

    def get_status(self) -> dict:
        """Get status of all simulators."""
        return {
            sim.name: {
                "running": sim.is_running,
                "interval": sim.interval_seconds,
                "enabled": sim.enabled,
            }
            for sim in self._simulators
        }


# Global simulation manager
simulation_manager = SimulationManager()
