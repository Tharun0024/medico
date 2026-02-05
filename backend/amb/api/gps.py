# backend/app/api/gps.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from amb.services.gps_simulator import start_simulation, get_current_gps
from amb.core.auth import get_current_ambulance  # existing from Phase 1


router = APIRouter(prefix="/gps", tags=["gps"])


class StartSimulationRequest(BaseModel):
    route_name: str | None = "default_city_loop"
    step_seconds: float | None = 3.0
    speed_kmh: float | None = 40.0


class GPSResponse(BaseModel):
    lat: float
    lng: float
    speed_kmh: float
    updated_at: str
    route_name: str
    route_index: int
    is_running: bool


@router.post("/start")
def start_gps_simulation(
    body: StartSimulationRequest,
    current_ambulance=Depends(get_current_ambulance),
):
    ambulance_id: str = current_ambulance["ambulance_id"]
    try:
        start_simulation(
            ambulance_id=ambulance_id,
            route_name=body.route_name or "default_city_loop",
            step_seconds=body.step_seconds or 3.0,
            speed_kmh=body.speed_kmh or 40.0,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return {"status": "started", "ambulance_id": ambulance_id}


@router.get("/current", response_model=GPSResponse)
def get_current_position(
    current_ambulance=Depends(get_current_ambulance),
):
    ambulance_id: str = current_ambulance["ambulance_id"]
    state = get_current_gps(ambulance_id)
    if not state:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="GPS simulation not started for this ambulance",
        )

    return GPSResponse(**state.to_dict())
