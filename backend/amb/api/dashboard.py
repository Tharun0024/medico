# backend/app/api/dashboard.py
"""
Dashboard API - Control Room endpoints
Phase 1, 5, 10, 12 of the workflow
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from amb.core.startup import AMBULANCE_REGISTRY
from amb.services.gps_simulator import GPS_STORE
from amb.services.signal_service import SIGNAL_STORE, get_or_init_signal
from amb.services.corridor_service import SIGNAL_POSITIONS
from amb.services.conflict_resolver import RESOURCE_LOCKS
from amb.core.signal_fsm import SignalState

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ─────────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────────

class AmbulanceInfo(BaseModel):
    id: str
    vehicle_number: str
    driver_id: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    state: str
    equipment_level: str
    hospital_id: Optional[str] = None
    last_location_update: Optional[str] = None


class ActiveTripInfo(BaseModel):
    trip_id: str
    ambulance_number: str
    ambulance_id: str
    state: str
    emergency_type: Optional[str] = None
    severity: Optional[str] = None
    destination: str
    eta_minutes: Optional[int] = None
    ambulance_lat: Optional[float] = None
    ambulance_lng: Optional[float] = None
    accident_lat: Optional[float] = None
    accident_lng: Optional[float] = None
    hospital_lat: Optional[float] = None
    hospital_lng: Optional[float] = None


class DashboardOverview(BaseModel):
    total_ambulances: int
    available_ambulances: int
    active_trips: int
    completed_today: int
    total_signals: int
    preempted_signals: int


class SignalInfo(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    state: str
    is_priority: bool
    controlled_by: Optional[str] = None
    green_time_remaining: Optional[float] = None


# ─────────────────────────────────────────────────────────────
# IMPORT TRIPS STORE (from trips.py)
# ─────────────────────────────────────────────────────────────

def get_trips_store():
    """Lazy import to avoid circular imports"""
    from amb.api.trips import TRIPS, AMBULANCE_STATES, EMERGENCIES, HOSPITALS_DB
    return TRIPS, AMBULANCE_STATES, EMERGENCIES, HOSPITALS_DB


# ─────────────────────────────────────────────────────────────
# SIGNAL DATA
# ─────────────────────────────────────────────────────────────

CHENNAI_SIGNALS = [
    {"id": "SIGNAL-001", "name": "Anna Salai Junction", "lat": 13.0827, "lng": 80.2707},
    {"id": "SIGNAL-002", "name": "T Nagar Main", "lat": 13.0418, "lng": 80.2341},
    {"id": "SIGNAL-003", "name": "Adyar Signal", "lat": 13.0012, "lng": 80.2565},
    {"id": "SIGNAL-004", "name": "Guindy Junction", "lat": 13.0067, "lng": 80.2082},
    {"id": "SIGNAL-005", "name": "Velachery Main", "lat": 12.9815, "lng": 80.2180},
    {"id": "SIGNAL-006", "name": "Mylapore Tank", "lat": 13.0368, "lng": 80.2676},
    {"id": "SIGNAL-007", "name": "Egmore Station", "lat": 13.0732, "lng": 80.2609},
    {"id": "SIGNAL-008", "name": "Mount Road Central", "lat": 13.0524, "lng": 80.2571},
    {"id": "SIGNAL-009", "name": "Kathipara Junction", "lat": 13.0086, "lng": 80.2078},
    {"id": "SIGNAL-010", "name": "Koyambedu", "lat": 13.0694, "lng": 80.1948},
]


# ─────────────────────────────────────────────────────────────
# DASHBOARD ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/overview", response_model=DashboardOverview)
async def get_overview():
    """Get dashboard overview stats (Phase 1)"""
    TRIPS, AMBULANCE_STATES, EMERGENCIES, _ = get_trips_store()
    
    # Count ambulances - check each ambulance's state (default to AVAILABLE)
    total_ambulances = len(AMBULANCE_REGISTRY)
    available = sum(
        1 for amb_id in AMBULANCE_REGISTRY.keys() 
        if AMBULANCE_STATES.get(amb_id, "AVAILABLE") == "AVAILABLE"
    )
    
    # Active trips (not completed/cancelled)
    active_trips = sum(
        1 for t in TRIPS.values() 
        if t['state'] not in ['COMPLETED', 'CANCELLED']
    )
    
    # Completed today (simplified - count completed trips)
    completed_today = sum(
        1 for t in TRIPS.values() 
        if t['state'] == 'COMPLETED'
    )
    
    # Signals
    preempted = sum(
        1 for sig in SIGNAL_STORE.values()
        if sig.current_state == SignalState.GREEN_FOR_AMBULANCE
    )
    
    return DashboardOverview(
        total_ambulances=total_ambulances,
        available_ambulances=available,
        active_trips=active_trips,
        completed_today=completed_today,
        total_signals=len(CHENNAI_SIGNALS),
        preempted_signals=preempted,
    )


@router.get("/ambulances", response_model=List[AmbulanceInfo])
async def get_all_ambulances():
    """Get all ambulances with current state (Phase 1)"""
    TRIPS, AMBULANCE_STATES, _, _ = get_trips_store()
    
    # Predefined scattered positions across Chennai for ambulances without GPS
    # These cover various neighborhoods: Anna Nagar, T Nagar, Adyar, Velachery, etc.
    scattered_positions = [
        (13.0850, 80.2101),  # Anna Nagar
        (13.0418, 80.2341),  # T Nagar
        (13.0012, 80.2565),  # Adyar
        (12.9815, 80.2180),  # Velachery
        (13.0827, 80.2707),  # Central Chennai
        (13.1067, 80.2206),  # Kilpauk
        (13.0358, 80.2580),  # Mylapore
        (13.0569, 80.1943),  # Vadapalani
        (13.0732, 80.2324),  # Chetpet
        (13.0289, 80.2100),  # Kodambakkam
        (13.1143, 80.2853),  # Tondiarpet
        (13.0632, 80.2850),  # Triplicane
        (12.9516, 80.2412),  # Thoraipakkam
        (13.0985, 80.1920),  # Aminjikarai
        (13.0132, 80.2206),  # Saidapet
        (13.0478, 80.2142),  # Ashok Nagar
        (13.1289, 80.2312),  # Perambur
        (12.9921, 80.2576),  # Besant Nagar
        (13.0715, 80.2538),  # Egmore
        (13.0547, 80.2526),  # Nungambakkam
        (13.0067, 80.2082),  # Guindy
        (12.9698, 80.2484),  # Thiruvanmiyur
        (13.0963, 80.2774),  # Royapuram
        (13.0389, 80.1789),  # Porur
        (13.1178, 80.2045),  # Kolathur
    ]
    
    result = []
    for idx, (amb_id, amb_data) in enumerate(AMBULANCE_REGISTRY.items()):
        # Get GPS if available
        gps = GPS_STORE.get(amb_id)
        
        # Get state from state store or default
        state = AMBULANCE_STATES.get(amb_id, "AVAILABLE")
        
        # Use scattered position if no GPS
        pos_idx = idx % len(scattered_positions)
        default_lat, default_lng = scattered_positions[pos_idx]
        
        result.append(AmbulanceInfo(
            id=amb_id,
            vehicle_number=amb_data.get('plate_number', f"TN-{amb_id}"),
            driver_id=amb_data.get('driver_id'),
            current_lat=gps.lat if gps else default_lat,
            current_lng=gps.lng if gps else default_lng,
            state=state,
            equipment_level=amb_data.get('type', 'ALS'),
            hospital_id=amb_data.get('hospital_id'),
            last_location_update=gps.updated_at.isoformat() if gps else None,
        ))
    
    return result


@router.get("/active-trips", response_model=List[ActiveTripInfo])
async def get_active_trips():
    """Get all active trips for map display (Phase 5, 10)"""
    TRIPS, _, EMERGENCIES, HOSPITALS_DB = get_trips_store()
    
    result = []
    for trip_id, trip in TRIPS.items():
        if trip['state'] in ['COMPLETED', 'CANCELLED']:
            continue
        
        # Get ambulance GPS
        amb_id = trip['ambulance_id']
        gps = GPS_STORE.get(amb_id)
        
        # Get emergency details
        emergency = EMERGENCIES.get(trip['emergency_id'], {})
        
        # Get hospital details
        hospital = HOSPITALS_DB.get(trip.get('hospital_id'), {})
        
        # Determine destination based on state
        if trip['state'] in ['PENDING', 'ACCEPTED', 'EN_ROUTE_TO_SCENE', 'AT_SCENE']:
            destination = emergency.get('location_address', 'Patient Location')
        else:
            destination = hospital.get('name', 'Hospital')
        
        # Calculate ETA (simple distance-based)
        eta_minutes = None
        if gps:
            if trip['state'] in ['PENDING', 'ACCEPTED', 'EN_ROUTE_TO_SCENE']:
                dist = ((gps.lat - emergency.get('location_lat', 0)) ** 2 + 
                       (gps.lng - emergency.get('location_lng', 0)) ** 2) ** 0.5 * 111
                eta_minutes = int(dist * 2)  # ~2 min per km
            else:
                dist = ((gps.lat - hospital.get('lat', 0)) ** 2 + 
                       (gps.lng - hospital.get('lng', 0)) ** 2) ** 0.5 * 111
                eta_minutes = int(dist * 2)
        
        result.append(ActiveTripInfo(
            trip_id=trip_id,
            ambulance_number=amb_id,
            ambulance_id=amb_id,
            state=trip['state'],
            emergency_type=emergency.get('emergency_type', 'EMERGENCY'),
            severity=trip.get('severity', 'HIGH'),
            destination=destination,
            eta_minutes=eta_minutes,
            ambulance_lat=gps.lat if gps else 13.05,
            ambulance_lng=gps.lng if gps else 80.25,
            accident_lat=emergency.get('location_lat'),
            accident_lng=emergency.get('location_lng'),
            hospital_lat=hospital.get('lat'),
            hospital_lng=hospital.get('lng'),
        ))
    
    return result


@router.get("/signals", response_model=List[SignalInfo])
async def get_all_signals():
    """Get all traffic signals with their states (Phase 6, 12)"""
    result = []
    
    for sig_data in CHENNAI_SIGNALS:
        sig_id = sig_data['id']
        fsm = get_or_init_signal(sig_id)
        
        # Check if locked by ambulance
        controlled_by = RESOURCE_LOCKS.get(sig_id)
        is_priority = fsm.current_state == SignalState.GREEN_FOR_AMBULANCE
        
        result.append(SignalInfo(
            id=sig_id,
            name=sig_data['name'],
            lat=sig_data['lat'],
            lng=sig_data['lng'],
            state="GREEN" if is_priority else "RED",
            is_priority=is_priority,
            controlled_by=controlled_by,
            green_time_remaining=fsm.green_time_remaining if hasattr(fsm, 'green_time_remaining') else None,
        ))
    
    return result


@router.get("/pending-cases")
async def get_pending_cases():
    """Get emergency cases awaiting ambulance assignment"""
    _, _, EMERGENCIES, _ = get_trips_store()
    
    return [e for e in EMERGENCIES.values() if not e.get('assigned')]


@router.get("/stats")
async def get_stats():
    """Get detailed statistics for dashboard"""
    TRIPS, AMBULANCE_STATES, _, _ = get_trips_store()
    
    # Calculate average response time (mock for demo)
    avg_response_time = 4.2  # minutes
    
    # Cases by severity
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MODERATE": 0, "LOW": 0}
    for trip in TRIPS.values():
        sev = trip.get('severity', 'HIGH')
        if sev in severity_counts:
            severity_counts[sev] += 1
    
    return {
        "avg_response_time_min": avg_response_time,
        "total_cases_today": len(TRIPS),
        "cases_by_severity": severity_counts,
        "ambulances_on_duty": len([s for s in AMBULANCE_STATES.values() if s != "OFFLINE"]),
        "signals_preempted_today": len(RESOURCE_LOCKS),
    }
