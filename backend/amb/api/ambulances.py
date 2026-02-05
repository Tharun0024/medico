# backend/app/api/ambulances.py
"""
Ambulance Management API
Phase 0, 5, 12 of the workflow
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from amb.core.auth import get_current_ambulance
from amb.core.startup import AMBULANCE_REGISTRY
from amb.services.gps_simulator import GPS_STORE, GPSState
from amb.services.corridor_service import get_corridor_ahead

router = APIRouter(prefix="/ambulances", tags=["ambulances"])


# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class LocationUpdate(BaseModel):
    lat: float
    lng: float


class AmbulanceStatus(BaseModel):
    id: str
    vehicle_number: str
    state: str
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    hospital_id: Optional[str] = None
    equipment_level: str
    speed_kmh: float = 0.0
    last_update: Optional[str] = None


# ─────────────────────────────────────────────────────────────
# IMPORT TRIPS STORE (from trips.py)
# ─────────────────────────────────────────────────────────────

def get_ambulance_states():
    """Lazy import to avoid circular imports"""
    from amb.api.trips import AMBULANCE_STATES
    return AMBULANCE_STATES


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("")
async def list_ambulances():
    """List all registered ambulances"""
    AMBULANCE_STATES = get_ambulance_states()
    
    result = []
    for amb_id, amb_data in AMBULANCE_REGISTRY.items():
        gps = GPS_STORE.get(amb_id)
        state = AMBULANCE_STATES.get(amb_id, "AVAILABLE")
        
        result.append({
            "id": amb_id,
            "vehicle_number": amb_data.get('plate_number', f"TN-{amb_id}"),
            "state": state,
            "current_lat": gps.lat if gps else None,
            "current_lng": gps.lng if gps else None,
            "hospital_id": amb_data.get('hospital_id'),
            "equipment_level": amb_data.get('type', 'ALS'),
            "speed_kmh": gps.speed_kmh if gps else 0,
            "last_update": gps.updated_at if gps else None,
        })
    
    return result


@router.get("/available")
async def list_available_ambulances():
    """List only available ambulances for assignment"""
    AMBULANCE_STATES = get_ambulance_states()
    
    result = []
    for amb_id, amb_data in AMBULANCE_REGISTRY.items():
        state = AMBULANCE_STATES.get(amb_id, "AVAILABLE")
        if state != "AVAILABLE":
            continue
        
        gps = GPS_STORE.get(amb_id)
        result.append({
            "id": amb_id,
            "vehicle_number": amb_data.get('plate_number', f"TN-{amb_id}"),
            "state": state,
            "current_lat": gps.lat if gps else 13.05 + len(result) * 0.01,
            "current_lng": gps.lng if gps else 80.22 + len(result) * 0.008,
            "hospital_id": amb_data.get('hospital_id'),
            "equipment_level": amb_data.get('type', 'ALS'),
        })
    
    return result


@router.get("/{ambulance_id}")
async def get_ambulance(ambulance_id: str):
    """Get ambulance details"""
    if ambulance_id not in AMBULANCE_REGISTRY:
        raise HTTPException(404, "Ambulance not found")
    
    AMBULANCE_STATES = get_ambulance_states()
    
    amb_data = AMBULANCE_REGISTRY[ambulance_id]
    gps = GPS_STORE.get(ambulance_id)
    state = AMBULANCE_STATES.get(ambulance_id, "AVAILABLE")
    
    return {
        "id": ambulance_id,
        "vehicle_number": amb_data.get('plate_number', f"TN-{ambulance_id}"),
        "state": state,
        "current_lat": gps.lat if gps else None,
        "current_lng": gps.lng if gps else None,
        "hospital_id": amb_data.get('hospital_id'),
        "equipment_level": amb_data.get('type', 'ALS'),
        "speed_kmh": gps.speed_kmh if gps else 0,
        "last_update": gps.updated_at if gps else None,
    }


@router.post("/{ambulance_id}/location")
async def update_location(
    ambulance_id: str,
    location: LocationUpdate,
    current_amb=Depends(get_current_ambulance)
):
    """Update ambulance GPS location (Driver app sends this)"""
    if current_amb['ambulance_id'] != ambulance_id:
        raise HTTPException(403, "Can only update own location")
    
    # Update or create GPS state
    now = datetime.now()  # Keep as datetime object, not string
    
    if ambulance_id in GPS_STORE:
        gps = GPS_STORE[ambulance_id]
        # Calculate speed based on distance moved
        old_lat, old_lng = gps.lat, gps.lng
        dist = ((location.lat - old_lat) ** 2 + (location.lng - old_lng) ** 2) ** 0.5 * 111000  # meters
        time_diff = 5  # Assume 5 second update interval
        speed = (dist / 1000) / (time_diff / 3600)  # km/h
        
        gps.lat = location.lat
        gps.lng = location.lng
        gps.speed_kmh = min(speed, 80)  # Cap at 80 km/h for realism
        gps.updated_at = now
    else:
        GPS_STORE[ambulance_id] = GPSState(
            lat=location.lat,
            lng=location.lng,
            speed_kmh=0,
            updated_at=now,
            route_name="live",
            route_index=0,
            is_running=True,
        )
    
    # Check if ambulance has an active trip and trigger corridor update
    AMBULANCE_STATES = get_ambulance_states()
    state = AMBULANCE_STATES.get(ambulance_id, "AVAILABLE")
    
    if state not in ["AVAILABLE", "OFFLINE", "COMPLETED"]:
        # Ambulance is on an active trip - update corridor and signal states
        # Get severity from active trip
        from amb.api.trips import TRIPS
        severity = "HIGH"  # Default
        for trip_id, trip in TRIPS.items():
            if trip['ambulance_id'] == ambulance_id and trip['state'] not in ['COMPLETED', 'CANCELLED']:
                severity = trip.get('severity', 'HIGH')
                break
        
        # This triggers signal FSM transitions based on distance
        corridor_signals = get_corridor_ahead(ambulance_id, severity)
        return {"status": "updated", "lat": location.lat, "lng": location.lng, "corridor_signals": corridor_signals}
    
    return {"status": "updated", "lat": location.lat, "lng": location.lng}


@router.put("/{ambulance_id}/status")
async def update_status(
    ambulance_id: str,
    status: str = Query(..., description="New status: AVAILABLE, OFFLINE, etc."),
    current_amb=Depends(get_current_ambulance)
):
    """Update ambulance status (Phase 0 - online/offline toggle)"""
    if current_amb['ambulance_id'] != ambulance_id:
        raise HTTPException(403, "Can only update own status")
    
    valid_statuses = ["AVAILABLE", "OFFLINE", "BUSY", "MAINTENANCE"]
    if status.upper() not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")
    
    AMBULANCE_STATES = get_ambulance_states()
    AMBULANCE_STATES[ambulance_id] = status.upper()
    
    return {"status": "updated", "ambulance_id": ambulance_id, "new_state": status.upper()}


@router.get("/{ambulance_id}/trip")
async def get_ambulance_trip(ambulance_id: str, current_amb=Depends(get_current_ambulance)):
    """Get current trip for this ambulance"""
    if current_amb['ambulance_id'] != ambulance_id:
        raise HTTPException(403, "Can only view own trip")
    
    from amb.api.trips import TRIPS, get_trip_with_details
    
    # Find active trip for this ambulance
    for trip_id, trip in TRIPS.items():
        if trip['ambulance_id'] == ambulance_id and trip['state'] not in ['COMPLETED', 'CANCELLED']:
            return get_trip_with_details(trip_id)
    
    return None
