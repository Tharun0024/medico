"""
MEDICO - AI-driven Hospital Coordination and Emergency Orchestration System

FastAPI Application Entrypoint
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.websocket import manager, setup_websocket_broadcasting
from app.database.init_db import init_db, close_db
from app.api.hospitals import router as hospitals_router
from app.api.beds import router as beds_router
from app.api.emergencies import router as emergencies_router
from app.api.admin import router as admin_router
from app.api.hospital_dashboard import router as hospital_dashboard_router
from app.api.waste_dashboard import router as waste_dashboard_router
from app.api.emergency_dashboard import router as emergency_dashboard_router
from app.api.medical_dashboard import router as medical_dashboard_router
from app.api.simulation import router as simulation_router

# Simulation imports
from app.simulation.base_simulator import simulation_manager
from app.simulation.hospital_sim import HospitalActivitySimulator
from app.simulation.emergency_sim import EmergencySimulator, EmergencyResolverSimulator
from app.simulation.waste_sim import WasteSimulator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

settings = get_settings()


def setup_simulation() -> None:
    """Register all simulators with the simulation manager."""
    simulation_manager.register(
        HospitalActivitySimulator(
            interval_seconds=settings.simulation_hospital_interval,
            enabled=settings.simulation_enabled,
        )
    )
    simulation_manager.register(
        EmergencySimulator(
            interval_seconds=settings.simulation_emergency_interval,
            enabled=settings.simulation_enabled,
        )
    )
    simulation_manager.register(
        EmergencyResolverSimulator(
            interval_seconds=30.0,
            enabled=settings.simulation_enabled,
        )
    )
    simulation_manager.register(
        WasteSimulator(
            interval_seconds=settings.simulation_waste_interval,
            enabled=settings.simulation_enabled,
        )
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    await init_db()
    
    # Setup WebSocket broadcasting
    setup_websocket_broadcasting()
    
    # Start simulation if enabled
    setup_simulation()
    if settings.simulation_enabled:
        await simulation_manager.start_all()
    
    yield
    
    # Shutdown
    await simulation_manager.stop_all()
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-driven Hospital Coordination and Emergency Orchestration System",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(hospitals_router, prefix="/api")
app.include_router(beds_router, prefix="/api")
app.include_router(emergencies_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(hospital_dashboard_router, prefix="/api")
app.include_router(waste_dashboard_router, prefix="/api")
app.include_router(emergency_dashboard_router, prefix="/api")
app.include_router(medical_dashboard_router, prefix="/api")
app.include_router(simulation_router)  # No /api prefix - mounted at /simulation


@app.get("/health", tags=["System"])
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/", tags=["System"])
async def root() -> dict:
    """Root endpoint with API info."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "status": "running",
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time event streaming.

    Connect to receive all MEDICO events in real-time.
    Events are broadcast automatically - no subscription needed.
    
    Client commands:
    - {"type": "ping"} -> responds with {"type": "pong"}
    - {"type": "status"} -> responds with connection count
    """
    await manager.connect(websocket)
    try:
        # Send welcome message
        await manager.send_personal(websocket, {
            "type": "connected",
            "message": "Connected to MEDICO event stream",
            "connections": manager.active_count,
        })
        
        while True:
            data = await websocket.receive_json()
            
            # Handle client commands
            msg_type = data.get("type", "")
            
            if msg_type == "ping":
                await manager.send_personal(websocket, {"type": "pong"})
            elif msg_type == "status":
                await manager.send_personal(websocket, {
                    "type": "status",
                    "connections": manager.active_count,
                    "simulation_enabled": settings.simulation_enabled,
                })
            else:
                # Echo unknown commands
                await manager.send_personal(websocket, {
                    "type": "echo",
                    "data": data,
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
