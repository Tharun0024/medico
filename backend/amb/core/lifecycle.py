# Startup tasks (seed, init)
from contextlib import asynccontextmanager
from fastapi import FastAPI
from amb.services.corridor_service import load_signals

from amb.core.startup import load_static_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    
    Startup:
      1. Load static JSON data (ambulances, hospitals)
    
    Shutdown:
      (No cleanup needed)
    """
    # Startup
    load_static_data()
    yield
    # Shutdown
    pass
load_signals()