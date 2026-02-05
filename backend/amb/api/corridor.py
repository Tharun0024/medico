from fastapi import APIRouter, Depends, HTTPException
from amb.core.auth import get_current_ambulance
from amb.services.gps_simulator import GPS_STORE
from amb.services.corridor_service import get_corridor_ahead
from amb.services.signal_service import get_or_init_signal
from amb.services.route_service import ROUTES  # Phase 5
from amb.core.startup import AMBULANCE_REGISTRY  # Phase 1 static
from pydantic import BaseModel

router = APIRouter(prefix="/corridor", tags=["corridor"])

class CorridorUpdate(BaseModel):
    severity: str  # Validated by Phase 3 Pydantic/FSM

@router.post("/update")
async def update_corridor(severity_input: CorridorUpdate, current_amb=Depends(get_current_ambulance)):
    corridor_signals = get_corridor_ahead(current_amb["ambulance_id"], severity_input.severity)
    hospital_id = AMBULANCE_REGISTRY.get(current_amb["ambulance_id"], {}).get('hospital_id')
    corridor_type = "route_aware" if corridor_signals else "radius_fallback"
    return {
        "ambulance_id": current_amb["ambulance_id"],
        "hospital_id": hospital_id,
        "severity": severity_input.severity,
        "corridor_signals": corridor_signals,
        "type": corridor_type
    }

@router.get("/{ambulance_id}")
async def get_corridor_status(ambulance_id: str, current_amb=Depends(get_current_ambulance)):
    if current_amb["ambulance_id"] != ambulance_id:
        raise HTTPException(403, "Only own ambulance")
    
    corridor = get_corridor_ahead(ambulance_id, "HIGH")  # Default for status
    hospital_id = AMBULANCE_REGISTRY.get(ambulance_id, {}).get('hospital_id')
    full_route = ROUTES.get(hospital_id, [])
    
    states = []
    for sig_id in corridor:
        fsm = get_or_init_signal(sig_id)
        # Recalc real dist for viz
        gps = GPS_STORE[ambulance_id]
        from amb.services.corridor_service import SIGNAL_POSITIONS
        if sig_id in SIGNAL_POSITIONS:
            lat, lon = SIGNAL_POSITIONS[sig_id]
            dist = ((gps.lat - lat)**2 + (gps.lng - lon)**2)**0.5 * 111
        else:
            dist = 999.0
        states.append({
            "signal_id": sig_id,
            "state": fsm.current_state.value,
            "reason": fsm.history[-1][1].reason if fsm.history else "Idle",
            "distance_km": round(dist, 3)
        })
    
    return {
        "ambulance_id": ambulance_id,
        "hospital_id": hospital_id,
        "full_route": full_route,
        "active_corridor": corridor,
        "states": states
    }
