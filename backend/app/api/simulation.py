"""
Simulation Control API Endpoints

Runtime control for MEDICO simulation system.
Allows starting/stopping simulation without server restart.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.rbac import require_role, UserRole, RequestContext
from app.simulation.base_simulator import simulation_manager


logger = logging.getLogger("medico.api.simulation")

router = APIRouter(prefix="/simulation", tags=["Simulation Control"])


class SimulatorStatus(BaseModel):
    """Status of a single simulator."""
    running: bool
    interval: float
    enabled: bool


class SimulationStatusResponse(BaseModel):
    """Complete simulation status response."""
    simulation_running: bool
    last_started_at: Optional[datetime] = None
    last_stopped_at: Optional[datetime] = None
    running_count: int
    total_count: int
    simulators: dict[str, SimulatorStatus]


class SimulationActionResponse(BaseModel):
    """Response for start/stop actions."""
    success: bool
    action: str
    message: str
    timestamp: datetime
    running_count: int


@router.get(
    "/status",
    response_model=SimulationStatusResponse,
    summary="Get simulation status",
    description="Returns detailed status of all simulators. Super Admin only.",
)
async def get_simulation_status(
    ctx: RequestContext = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> SimulationStatusResponse:
    """
    Get comprehensive simulation system status.
    
    Returns:
    - Whether simulation is currently running
    - Timestamps for last start/stop
    - Count of running simulators
    - Detailed status for each simulator
    """
    status_data = simulation_manager.get_status()
    running_count = sum(1 for s in status_data.values() if s["running"])
    
    return SimulationStatusResponse(
        simulation_running=simulation_manager.is_running,
        last_started_at=simulation_manager.last_started_at,
        last_stopped_at=simulation_manager.last_stopped_at,
        running_count=running_count,
        total_count=len(status_data),
        simulators={
            name: SimulatorStatus(**data)
            for name, data in status_data.items()
        },
    )


@router.post(
    "/start",
    response_model=SimulationActionResponse,
    summary="Start simulation",
    description="Starts all registered simulators. Idempotent - safe to call if already running.",
)
async def start_simulation(
    ctx: RequestContext = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> SimulationActionResponse:
    """
    Start all simulators.
    
    This operation is idempotent - calling it when simulation
    is already running has no effect.
    
    Returns confirmation with timestamp and running count.
    """
    if simulation_manager.is_running:
        status_data = simulation_manager.get_status()
        running_count = sum(1 for s in status_data.values() if s["running"])
        
        logger.info("Simulation start requested but already running")
        return SimulationActionResponse(
            success=True,
            action="start",
            message="Simulation is already running",
            timestamp=datetime.utcnow(),
            running_count=running_count,
        )
    
    # Enable all simulators for runtime start
    for sim in simulation_manager._simulators:
        sim.enabled = True
    
    await simulation_manager.start_all()
    
    status_data = simulation_manager.get_status()
    running_count = sum(1 for s in status_data.values() if s["running"])
    
    logger.info(f"Simulation started via API - {running_count} simulators running")
    
    return SimulationActionResponse(
        success=True,
        action="start",
        message=f"Simulation started successfully - {running_count} simulators running",
        timestamp=datetime.utcnow(),
        running_count=running_count,
    )


@router.post(
    "/stop",
    response_model=SimulationActionResponse,
    summary="Stop simulation",
    description="Gracefully stops all running simulators. Idempotent - safe to call if already stopped.",
)
async def stop_simulation(
    ctx: RequestContext = Depends(require_role(UserRole.SUPER_ADMIN)),
) -> SimulationActionResponse:
    """
    Stop all simulators gracefully.
    
    This operation is idempotent - calling it when simulation
    is already stopped has no effect.
    
    Returns confirmation with timestamp.
    """
    if not simulation_manager.is_running:
        logger.info("Simulation stop requested but not running")
        return SimulationActionResponse(
            success=True,
            action="stop",
            message="Simulation is already stopped",
            timestamp=datetime.utcnow(),
            running_count=0,
        )
    
    await simulation_manager.stop_all()
    
    logger.info("Simulation stopped via API")
    
    return SimulationActionResponse(
        success=True,
        action="stop",
        message="Simulation stopped successfully",
        timestamp=datetime.utcnow(),
        running_count=0,
    )
