"""
MEDICO + AMB Unified Backend Server

This is the unified entrypoint for both systems:
- MEDICO (app/): Hospital coordination, emergencies, beds, waste
- AMB (amb/): Ambulance routing, GPS, traffic signals

Routing:
- /api/*  → MEDICO APIs
- /amb/*  → AMB APIs
- /       → Server info
- /health → Health check
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ─────────────────────────────────────────────────────────────────────────────
# MEDICO Imports
# ─────────────────────────────────────────────────────────────────────────────
from app.core.config import get_settings
from app.core.websocket import manager, setup_websocket_broadcasting
from app.database.init_db import init_db, close_db
from app.simulation.base_simulator import simulation_manager
from app.simulation.hospital_sim import HospitalActivitySimulator
from app.simulation.emergency_sim import EmergencySimulator, EmergencyResolverSimulator
from app.simulation.waste_sim import WasteSimulator

# MEDICO Routers
from app.api.hospitals import router as hospitals_router
from app.api.beds import router as beds_router
from app.api.emergencies import router as emergencies_router
from app.api.admin import router as admin_router
from app.api.hospital_dashboard import router as hospital_dashboard_router
from app.api.waste_dashboard import router as waste_dashboard_router
from app.api.emergency_dashboard import router as emergency_dashboard_router
from app.api.medical_dashboard import router as medical_dashboard_router
from app.api.simulation import router as simulation_router
from app.notifications.api import router as notifications_router
from app.api.control_room.api import router as control_room_router
from app.api.hospital_admin.api import router as hospital_admin_router
from app.api.medical_staff.api import router as medical_staff_router
from app.api.waste_team.api import router as waste_team_router
from app.api.super_admin.api import router as super_admin_router

# ─────────────────────────────────────────────────────────────────────────────
# AMB Imports
# ─────────────────────────────────────────────────────────────────────────────
from amb.core.config import settings as amb_settings
from amb.core.lifecycle import lifespan as amb_lifespan_logic
from amb.api import health as amb_health
from amb.api import gps as amb_gps
from amb.api import traffic as amb_traffic
from amb.routes import ambulance as amb_ambulance
from amb.api.corridor import router as amb_corridor_router
from amb.api import signal as amb_signal
from amb.api import system as amb_system
from amb.api import trips as amb_trips
from amb.api import dashboard as amb_dashboard
from amb.api import ambulances as amb_ambulances

# ─────────────────────────────────────────────────────────────────────────────
# Logging Configuration
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("medico.unified")

settings = get_settings()


# ─────────────────────────────────────────────────────────────────────────────
# MEDICO Simulation Setup
# ─────────────────────────────────────────────────────────────────────────────
def setup_medico_simulation() -> None:
    """Register MEDICO simulators (beds, emergencies, waste)."""
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


# ─────────────────────────────────────────────────────────────────────────────
# AMB Startup Logic
# ─────────────────────────────────────────────────────────────────────────────
def setup_amb() -> None:
    """Initialize AMB static data (ambulances, hospitals, signals)."""
    from amb.core.startup import load_static_data
    from amb.services.corridor_service import load_signals
    load_static_data()
    load_signals()


async def seed_and_validate_hospitals() -> None:
    """
    Seed hospitals from shared JSON and validate alignment.
    
    This is a CRITICAL startup check that:
    1. Seeds any missing hospitals from backend/data/hospitals.json
    2. Validates ALL hospitals match the JSON exactly
    3. FAILS LOUDLY if any mismatch is detected
    
    MEDICO hospital IDs are EXPLICIT (not auto-increment) and must
    match the medico_id values in hospitals.json.
    
    Raises:
        HospitalDataMismatchError: If hospital data doesn't match JSON
        SystemExit: If validation fails (prevents server from starting)
    """
    from app.database.seed_hospitals import (
        seed_and_validate,
        HospitalDataMismatchError,
    )
    from app.database.session import async_session_maker
    
    try:
        async with async_session_maker() as session:
            await seed_and_validate(session)
        logger.info("Hospital seeding and validation complete")
        
    except HospitalDataMismatchError as e:
        logger.critical(
            f"FATAL: Hospital data mismatch detected!\n{e}\n"
            "The server cannot start with misaligned hospital data.\n"
            "Fix the data or reset the database and restart."
        )
        raise SystemExit(1)
    except FileNotFoundError as e:
        logger.critical(f"FATAL: {e}")
        raise SystemExit(1)
    except Exception as e:
        logger.error(f"Hospital seeding failed: {e}", exc_info=True)
        raise


async def validate_amb_hospital_alignment() -> None:
    """
    Validate AMB's hospital loader matches the shared data.
    
    This ensures the amb/data/hospital_loader.py correctly reads
    from backend/data/hospitals.json.
    
    Raises:
        SystemExit: If AMB hospital data is invalid
    """
    try:
        from amb.data.hospital_loader import (
            load_hospitals,
            get_medico_id_mapping,
            get_amb_id_mapping,
        )
        import json
        from pathlib import Path
        
        # Load from AMB's loader
        amb_hospitals = load_hospitals(force_reload=True)
        medico_mapping = get_medico_id_mapping()
        amb_mapping = get_amb_id_mapping()
        
        # Load directly from JSON for comparison
        json_path = Path(__file__).parent / "data" / "hospitals.json"
        with open(json_path, "r") as f:
            json_data = json.load(f)
        
        expected_count = len(json_data.get("hospitals", []))
        actual_count = len(amb_hospitals)
        
        if actual_count != expected_count:
            logger.critical(
                f"FATAL: AMB hospital loader count mismatch! "
                f"Expected {expected_count}, got {actual_count}"
            )
            raise SystemExit(1)
        
        # Validate mappings are bidirectional
        for h in amb_hospitals:
            if medico_mapping.get(h.id) != h.medico_id:
                logger.critical(
                    f"FATAL: AMB ID mapping broken for {h.id}: "
                    f"expected medico_id={h.medico_id}, got {medico_mapping.get(h.id)}"
                )
                raise SystemExit(1)
            
            if amb_mapping.get(h.medico_id) != h.id:
                logger.critical(
                    f"FATAL: MEDICO ID mapping broken for {h.medico_id}: "
                    f"expected amb_id={h.id}, got {amb_mapping.get(h.medico_id)}"
                )
                raise SystemExit(1)
        
        logger.info(
            f"AMB hospital alignment validated: {actual_count} hospitals, "
            f"bidirectional mappings OK"
        )
        
    except SystemExit:
        raise
    except Exception as e:
        logger.error(f"AMB hospital validation failed: {e}", exc_info=True)
        raise SystemExit(1)


# ─────────────────────────────────────────────────────────────────────────────
# Unified Lifespan
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Unified application lifespan for both MEDICO and AMB.
    
    Startup:
    1. Initialize MEDICO database tables
    2. Seed hospitals from shared JSON (explicit IDs)
    3. Validate hospital data alignment (FATAL on mismatch)
    4. Setup MEDICO WebSocket broadcasting
    5. Start MEDICO simulation
    6. Load AMB static data
    7. Validate AMB hospital alignment
    
    Shutdown:
    1. Stop MEDICO simulation
    2. Close MEDICO database
    
    CRITICAL: Server will NOT start if hospital data is misaligned.
    """
    logger.info("Starting unified MEDICO + AMB server...")
    
    # MEDICO Database Initialization
    await init_db()
    logger.info("MEDICO database initialized")
    
    # Hospital Seeding and Validation (FATAL on mismatch)
    await seed_and_validate_hospitals()
    
    # MEDICO Services
    setup_websocket_broadcasting()
    setup_medico_simulation()
    if settings.simulation_enabled:
        await simulation_manager.start_all()
    logger.info("MEDICO services initialized")
    
    # AMB Startup
    setup_amb()
    logger.info("AMB initialized")
    
    # AMB Hospital Alignment Validation (FATAL on mismatch)
    await validate_amb_hospital_alignment()
    
    logger.info("=" * 60)
    logger.info("MEDICO + AMB Server READY")
    logger.info("=" * 60)
    
    yield
    
    # MEDICO Shutdown
    await simulation_manager.stop_all()
    await close_db()
    logger.info("Server shutdown complete")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="MEDICO + AMB Unified Server",
    version="2.0.0",
    description=(
        "Unified backend for MEDICO (Hospital Coordination) "
        "and AMB (Ambulance Routing) systems"
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# MEDICO Routers (/api/*)
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(hospitals_router, prefix="/api", tags=["MEDICO - Hospitals"])
app.include_router(beds_router, prefix="/api", tags=["MEDICO - Beds"])
app.include_router(emergencies_router, prefix="/api", tags=["MEDICO - Emergencies"])
app.include_router(admin_router, prefix="/api", tags=["MEDICO - Admin Dashboard"])
app.include_router(hospital_dashboard_router, prefix="/api", tags=["MEDICO - Hospital Dashboard"])
app.include_router(waste_dashboard_router, prefix="/api", tags=["MEDICO - Waste Dashboard"])
app.include_router(emergency_dashboard_router, prefix="/api", tags=["MEDICO - Emergency Dashboard"])
app.include_router(medical_dashboard_router, prefix="/api", tags=["MEDICO - Medical Dashboard"])
app.include_router(notifications_router, prefix="/api", tags=["MEDICO - Notifications"])
app.include_router(control_room_router, tags=["MEDICO - Control Room"])  # Already has /api/control prefix
app.include_router(hospital_admin_router, tags=["MEDICO - Hospital Admin"])  # Already has /api/hospital prefix
app.include_router(medical_staff_router, tags=["MEDICO - Medical Staff"])  # Already has /api/medical prefix
app.include_router(waste_team_router, tags=["MEDICO - Waste Team"])  # Already has /api/waste prefix
app.include_router(super_admin_router, tags=["MEDICO - Super Admin"])  # Already has /api/admin prefix
app.include_router(simulation_router, tags=["MEDICO - Simulation"])  # Already has /simulation prefix


# ─────────────────────────────────────────────────────────────────────────────
# AMB Routers (/amb/*)
# ─────────────────────────────────────────────────────────────────────────────
app.include_router(amb_health.router, prefix="/amb", tags=["AMB - Health"])
app.include_router(amb_ambulance.router, prefix="/amb", tags=["AMB - Ambulance Auth"])
app.include_router(amb_gps.router, prefix="/amb", tags=["AMB - GPS"])
app.include_router(amb_traffic.router, prefix="/amb", tags=["AMB - Traffic"])
app.include_router(amb_signal.router, prefix="/amb", tags=["AMB - Signals"])
app.include_router(amb_corridor_router, prefix="/amb", tags=["AMB - Corridor"])
app.include_router(amb_trips.router, prefix="/amb", tags=["AMB - Trips"])
app.include_router(amb_dashboard.router, prefix="/amb", tags=["AMB - Dashboard"])
app.include_router(amb_ambulances.router, prefix="/amb", tags=["AMB - Ambulances"])
app.include_router(amb_system.router, prefix="/amb", tags=["AMB - System"])


# ─────────────────────────────────────────────────────────────────────────────
# Root Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/", tags=["System"])
async def root():
    """Root endpoint with unified server info."""
    return {
        "name": "MEDICO + AMB Unified Server",
        "version": "2.0.0",
        "status": "running",
        "systems": {
            "medico": {
                "prefix": "/api",
                "description": "Hospital Coordination & Emergency Orchestration",
                "docs": "/docs#/MEDICO",
            },
            "amb": {
                "prefix": "/amb",
                "description": "Ambulance Routing & Traffic Signal Control",
                "docs": "/docs#/AMB",
            },
        },
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "websocket": "/ws",
        },
    }


@app.get("/health", tags=["System"])
async def health_check():
    """Unified health check."""
    return {
        "status": "ok",
        "systems": {
            "medico": "ok",
            "amb": "ok",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket (MEDICO only)
# ─────────────────────────────────────────────────────────────────────────────
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time MEDICO event streaming.
    
    Connect to receive all MEDICO events in real-time.
    """
    await manager.connect(websocket)
    try:
        await manager.send_personal(websocket, {
            "type": "connected",
            "message": "Connected to MEDICO event stream",
            "connections": manager.active_count,
        })
        
        while True:
            data = await websocket.receive_json()
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
                await manager.send_personal(websocket, {
                    "type": "echo",
                    "data": data,
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
