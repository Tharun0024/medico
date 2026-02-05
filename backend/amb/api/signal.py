from fastapi import APIRouter, Depends, HTTPException
from amb.core.auth import get_current_ambulance
from amb.services.signal_service import update_signal_for_ambulance, SignalState, get_or_init_signal
from pydantic import BaseModel, validator
import time

router = APIRouter(prefix="/signals", tags=["signals"])

class SeverityInput(BaseModel):
    severity: str

    @validator('severity')
    def validate_severity(cls, v):
        norm = v.upper().strip()
        if norm not in {"LOW", "MODERATE", "HIGH", "CRITICAL"}:
            raise ValueError(f"Invalid severity '{v}'; must be LOW/MODERATE/HIGH/CRITICAL")
        return v  # FSM normalizes again for safety

class SignalResponse(BaseModel):
    state: str
    reason: str
    distance_km: float
    severity: str

@router.post("/{ambulance_id}", response_model=SignalResponse)
async def simulate_priority(ambulance_id: str, severity_input: SeverityInput, current_amb = Depends(get_current_ambulance)):
    if current_amb["ambulance_id"] != ambulance_id:
        raise HTTPException(403, "Only own ambulance")
    state, reason = update_signal_for_ambulance(ambulance_id, severity_input.severity)
    # Recalc dist for response (demo clarity)
    from amb.services.gps_simulator import GPS_STORE
    gps = GPS_STORE[ambulance_id]
    signal_lat, signal_lng = 13.0827, 80.2707
    dist = ((gps.lat - signal_lat)**2 + (gps.lng - signal_lng)**2)**0.5 * 111
    return SignalResponse(state=state.value, reason=reason.reason, distance_km=round(dist, 3), severity=severity_input.severity.upper())

@router.get("/{signal_id}/state")
async def get_signal_state(signal_id: str = "SIGNAL-001"):
    fsm = get_or_init_signal(signal_id)
    return {"state": fsm.current_state.value, "history_count": len(fsm.history), "green_time_remaining": max(0, fsm.max_green_time - (time.time() - fsm.green_start_time) if fsm.green_start_time else 0)}
