# backend/app/main.py
"""
AI-Based Smart Ambulance Routing & Signal Simulation System
Complete API Server

Phases:
- 0: System Startup & Initialization
- 1: Live Monitoring (Dashboard)
- 2: Patient Request Creation
- 3: Ambulance Assignment
- 4-6: Route, Tracking, Signal Priority
- 7: Congestion & Rerouting
- 8-11: Trip Lifecycle
- 12: Supporting Pages
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from amb.core.config import settings
from amb.core.lifecycle import lifespan
from amb.api import health
from amb.api import gps, traffic
from amb.routes import ambulance
from amb.api.corridor import router as corridor_router
from amb.api import signal
from amb.api import system
from amb.api import trips
from amb.api import dashboard
from amb.api import ambulances

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Based Smart Ambulance Routing & Signal Simulation System for Chennai",
    version="2.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────
# ROUTE REGISTRATION
# ─────────────────────────────────────────────────────────────

# Core APIs
app.include_router(health.router)           # Health check
app.include_router(ambulance.router)        # Phase 0: Auth/Registration

# Location & Traffic
app.include_router(gps.router)              # Phase 2: GPS Simulation
app.include_router(traffic.router)          # Phase 2: Traffic data

# Signal Control
app.include_router(signal.router)           # Phase 3: Signal FSM
app.include_router(corridor_router)         # Phase 4-6: Green Corridor

# Trip Management (NEW - Complete workflow)
app.include_router(trips.router)            # Phase 2-11: Full trip lifecycle
app.include_router(dashboard.router)        # Phase 1, 12: Control Room Dashboard
app.include_router(ambulances.router)       # Phase 0, 5: Ambulance management

# System monitoring
app.include_router(system.router)           # Phase 8: System status & logs


# ─────────────────────────────────────────────────────────────
# ROOT ENDPOINT
# ─────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "name": "Smart Ambulance Routing System",
        "version": "2.0.0",
        "location": "Chennai Metropolitan Area",
        "status": "operational",
        "endpoints": {
            "dashboard": "/dashboard/overview",
            "ambulances": "/ambulances",
            "trips": "/trips",
            "signals": "/dashboard/signals",
            "health": "/health",
        }
    }