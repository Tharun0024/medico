# backend/app/api/trips.py
"""
Trip Management API - Complete CRUD for ambulance trips
Phases 2-11 of the workflow
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

from amb.core.auth import get_current_ambulance
from amb.services.gps_simulator import GPS_STORE
from amb.services.corridor_service import get_corridor_ahead, SIGNAL_POSITIONS
from amb.services.signal_service import get_or_init_signal, SIGNAL_STORE
from amb.core.signal_fsm import SignalState

router = APIRouter(prefix="/trips", tags=["trips"])


# ─────────────────────────────────────────────────────────────
# ENUMS & MODELS
# ─────────────────────────────────────────────────────────────

class TripState(str, Enum):
    PENDING = "PENDING"
    ASSIGNMENT_FAILED = "ASSIGNMENT_FAILED"  # MEDICO hospital assignment failed
    ACCEPTED = "ACCEPTED"
    EN_ROUTE_TO_SCENE = "EN_ROUTE_TO_SCENE"
    AT_SCENE = "AT_SCENE"
    PATIENT_ONBOARD = "PATIENT_ONBOARD"
    EN_ROUTE_TO_HOSPITAL = "EN_ROUTE_TO_HOSPITAL"
    AT_HOSPITAL = "AT_HOSPITAL"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Severity(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EmergencyCreate(BaseModel):
    location_lat: float
    location_lng: float
    location_address: Optional[str] = None
    emergency_type: str = "ACCIDENT"
    severity: Severity = Severity.HIGH
    description: Optional[str] = None
    reported_victims: int = 1
    caller_name: Optional[str] = None

    @validator('severity', pre=True)
    def normalize_severity(cls, v):
        if isinstance(v, str):
            return v.upper().strip()
        return v


class TripCreate(BaseModel):
    """
    Trip creation request.
    
    Dispatcher manually selects:
    - ambulance_id: Which ambulance to dispatch
    - hospital_id: Destination hospital (dispatcher choice)
    
    MEDICO validates bed availability and reserves the bed.
    """
    emergency_id: str  # AMB local emergency ID
    ambulance_id: str
    hospital_id: str  # Dispatcher-selected hospital (MEDICO validates)
    
    # MEDICO integration fields (optional - populated after MEDICO sync)
    medico_emergency_id: Optional[int] = None  # MEDICO emergency ID
    medico_bed_group_id: Optional[int] = None  # MEDICO bed group for reservation
    assignment_reason: Optional[str] = None  # Reason for hospital selection


class Emergency(BaseModel):
    id: str
    location_lat: float
    location_lng: float
    location_address: Optional[str]
    emergency_type: str
    severity: str
    description: Optional[str]
    reported_victims: int
    caller_name: Optional[str]
    created_at: str


class Hospital(BaseModel):
    """Hospital as a destination only. Bed availability is managed by MEDICO."""
    id: str
    name: str
    address: Optional[str] = None
    lat: float
    lng: float
    # NOTE: Bed availability is NOT tracked here.
    # AMB treats hospitals as destinations only.
    # MEDICO is the system of record for bed management.


class TripResponse(BaseModel):
    id: str
    emergency_id: str
    ambulance_id: str
    hospital_id: Optional[str]
    state: str
    eta_to_scene: Optional[float] = None
    eta_to_hospital: Optional[float] = None
    distance_to_scene: Optional[float] = None
    distance_to_hospital: Optional[float] = None
    signals_preempted: int = 0
    emergency: Optional[Emergency] = None
    hospital: Optional[Hospital] = None
    created_at: str
    updated_at: str


# ─────────────────────────────────────────────────────────────
# IN-MEMORY STORES (Demo purposes)
# ─────────────────────────────────────────────────────────────

EMERGENCIES: dict[str, dict] = {}
TRIPS: dict[str, dict] = {}
AMBULANCE_STATES: dict[str, str] = {}  # ambulance_id -> state

# ─────────────────────────────────────────────────────────────
# HOSPITAL DATA - LOADED FROM SHARED SOURCE OF TRUTH
# ─────────────────────────────────────────────────────────────
# NOTE: AMB does NOT track bed availability. MEDICO is the system of record.
# Hospitals are loaded from backend/data/hospitals.json (shared with MEDICO).
# This ensures both systems reference the SAME hospital data.

from amb.data.hospital_loader import (
    get_hospitals_as_db,
    get_hospital_by_id,
    amb_id_to_medico_id,
    medico_id_to_amb_id,
)

# Lazy-loaded hospital database (routing destinations only)
def get_hospitals_db() -> dict[str, dict]:
    """Get hospital database, loading from shared source if needed."""
    return get_hospitals_as_db()

# For backward compatibility - reference the function instead of static dict
# Code using HOSPITALS_DB[id] should use get_hospitals_db()[id] or get_hospital_by_id(id)
HOSPITALS_DB: dict[str, dict] = get_hospitals_as_db()


# ─────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters using Euclidean approximation"""
    return ((lat1 - lat2) ** 2 + (lng1 - lng2) ** 2) ** 0.5 * 111000  # ~111km per degree


def estimate_eta(distance_m: float, speed_kmh: float = 40) -> float:
    """Estimate ETA in seconds given distance in meters"""
    return (distance_m / 1000) / speed_kmh * 3600


def find_nearest_hospital(lat: float, lng: float) -> str:
    """
    DEPRECATED: Hospital selection is MEDICO's responsibility.
    
    AMB does NOT select hospitals. This function exists only for
    backward compatibility and returns a fallback destination.
    
    In production, hospital_id MUST be provided by MEDICO via API.
    """
    # Return first hospital as fallback - this should NOT be used in production
    # MEDICO must provide the hospital_id based on bed availability and severity
    import logging
    logging.getLogger("amb.trips").warning(
        "find_nearest_hospital() called - hospital selection should come from MEDICO"
    )
    return "HOSP-001"  # Fallback only


def get_trip_with_details(trip_id: str) -> dict:
    """Get full trip details including emergency and hospital data"""
    trip = TRIPS.get(trip_id)
    if not trip:
        return None
    
    result = {**trip}
    
    # Add emergency details
    if trip.get('emergency_id') in EMERGENCIES:
        result['emergency'] = EMERGENCIES[trip['emergency_id']]
    
    # Add hospital details
    if trip.get('hospital_id') in HOSPITALS_DB:
        result['hospital'] = HOSPITALS_DB[trip['hospital_id']]
    
    # Calculate current distances & ETAs from GPS
    amb_id = trip.get('ambulance_id')
    has_gps = amb_id in GPS_STORE
    
    if has_gps:
        gps = GPS_STORE[amb_id]
        
        # Distance to scene
        if result.get('emergency'):
            em = result['emergency']
            dist = calculate_distance(gps.lat, gps.lng, em['location_lat'], em['location_lng'])
            result['distance_to_scene'] = dist
            result['eta_to_scene'] = estimate_eta(dist)
        
        # Distance to hospital
        if result.get('hospital'):
            hosp = result['hospital']
            dist = calculate_distance(gps.lat, gps.lng, hosp['lat'], hosp['lng'])
            result['distance_to_hospital'] = dist
            result['eta_to_hospital'] = estimate_eta(dist)
    else:
        # Fallback: calculate between emergency and hospital (no GPS yet)
        if result.get('emergency') and result.get('hospital'):
            em = result['emergency']
            hosp = result['hospital']
            dist_to_hospital = calculate_distance(em['location_lat'], em['location_lng'], hosp['lat'], hosp['lng'])
            result['distance_to_hospital'] = dist_to_hospital
            result['eta_to_hospital'] = estimate_eta(dist_to_hospital)
            # Assume ambulance is 2km from scene if no GPS
            result['distance_to_scene'] = 2000  # 2km default
            result['eta_to_scene'] = estimate_eta(2000)
    
    # Count preempted signals
    corridor = get_corridor_ahead(amb_id, trip.get('severity', 'HIGH')) if amb_id else []
    result['signals_preempted'] = len([
        s for s in corridor 
        if get_or_init_signal(s).current_state == SignalState.GREEN_FOR_AMBULANCE
    ])
    
    return result


# ─────────────────────────────────────────────────────────────
# EMERGENCY ENDPOINTS (Phase 2)
# ─────────────────────────────────────────────────────────────

@router.post("/emergencies", status_code=status.HTTP_201_CREATED)
async def create_emergency(emergency: EmergencyCreate):
    """Create a new emergency request (Control Room action)"""
    emergency_id = f"EM-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(EMERGENCIES) + 1:03d}"
    
    em_data = {
        "id": emergency_id,
        "location_lat": emergency.location_lat,
        "location_lng": emergency.location_lng,
        "location_address": emergency.location_address or f"Chennai ({emergency.location_lat:.4f}, {emergency.location_lng:.4f})",
        "emergency_type": emergency.emergency_type,
        "severity": emergency.severity.value,
        "description": emergency.description,
        "reported_victims": emergency.reported_victims,
        "caller_name": emergency.caller_name,
        "created_at": datetime.now().isoformat(),
        "assigned": False,
    }
    
    EMERGENCIES[emergency_id] = em_data
    return em_data


@router.get("/emergencies")
async def list_emergencies():
    """List all active emergencies"""
    return list(EMERGENCIES.values())


@router.get("/emergencies/pending")
async def list_pending_emergencies():
    """List emergencies waiting for assignment"""
    return [e for e in EMERGENCIES.values() if not e.get('assigned')]


# ─────────────────────────────────────────────────────────────
# TRIP ENDPOINTS (Phase 3-11)
# ─────────────────────────────────────────────────────────────

import logging
trip_logger = logging.getLogger("amb.trips")


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_trip(trip: TripCreate):
    """
    Create a new trip / assign ambulance (Control Room / Dispatcher action).
    
    WORKFLOW:
    1. Dispatcher selects ambulance and hospital manually
    2. AMB calls MEDICO to validate and reserve bed
    3. If MEDICO approves → trip starts, routing begins
    4. If MEDICO rejects → trip marked ASSIGNMENT_FAILED
    
    MEDICO handles:
    - Bed availability validation
    - Bed reservation
    - Hospital admin notification
    - Dashboard updates
    
    AMB handles:
    - Routing to hospital
    - GPS/signal priority
    - Trip state management
    """
    if trip.emergency_id not in EMERGENCIES:
        raise HTTPException(404, "Emergency not found")
    
    # Validate hospital exists as a known destination
    if trip.hospital_id not in HOSPITALS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown hospital destination: {trip.hospital_id}. "
                   f"Hospital must be a valid destination ID."
        )
    
    emergency = EMERGENCIES[trip.emergency_id]
    hospital_id = trip.hospital_id
    
    trip_id = f"TRIP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{len(TRIPS) + 1:03d}"
    
    # Initialize trip data
    trip_data = {
        "id": trip_id,
        "emergency_id": trip.emergency_id,
        "ambulance_id": trip.ambulance_id,
        "hospital_id": hospital_id,
        "state": TripState.PENDING.value,
        "severity": emergency['severity'],
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        # MEDICO integration fields
        "medico_emergency_id": trip.medico_emergency_id,
        "medico_bed_group_id": trip.medico_bed_group_id,
        "assignment_reason": trip.assignment_reason,
        "assignment_error": None,
    }
    
    # If MEDICO emergency ID is provided, attempt hospital assignment
    if trip.medico_emergency_id and trip.medico_bed_group_id:
        try:
            from amb.integrations.medico_client import get_medico_client, MedicoAPIError
            
            # Map AMB hospital ID to MEDICO hospital ID using shared mapping
            medico_hospital_id = amb_id_to_medico_id(hospital_id)
            if medico_hospital_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Hospital {hospital_id} has no MEDICO mapping. Check backend/data/hospitals.json"
                )
            
            async with get_medico_client() as client:
                assignment = await client.assign_hospital(
                    emergency_id=trip.medico_emergency_id,
                    hospital_id=medico_hospital_id,
                    bed_group_id=trip.medico_bed_group_id,
                    reason=trip.assignment_reason or "Dispatcher manual selection",
                )
                
                trip_logger.info(
                    f"MEDICO assignment successful: trip={trip_id}, "
                    f"hospital={assignment.hospital_name}, ward={assignment.ward_type}"
                )
                
                # Update trip with MEDICO assignment details
                trip_data["medico_hospital_id"] = assignment.hospital_id
                trip_data["medico_hospital_name"] = assignment.hospital_name
                trip_data["medico_ward_type"] = assignment.ward_type
                
        except MedicoAPIError as e:
            # MEDICO rejected the assignment (no beds, invalid hospital, etc.)
            trip_logger.warning(
                f"MEDICO assignment failed: trip={trip_id}, error={e.detail}"
            )
            trip_data["state"] = TripState.ASSIGNMENT_FAILED.value
            trip_data["assignment_error"] = str(e.detail)
            
            TRIPS[trip_id] = trip_data
            
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "hospital_assignment_failed",
                    "message": f"MEDICO rejected hospital assignment: {e.detail}",
                    "trip_id": trip_id,
                    "hospital_id": hospital_id,
                    "hint": "Choose a different hospital with available beds.",
                }
            )
        except Exception as e:
            # Connection error or other failure - log but continue
            trip_logger.error(f"MEDICO connection error: {e}")
            trip_data["assignment_error"] = f"MEDICO unavailable: {e}"
            # Continue with trip - MEDICO integration is optional for now
    
    # Mark emergency as assigned
    emergency['assigned'] = True
    
    TRIPS[trip_id] = trip_data
    AMBULANCE_STATES[trip.ambulance_id] = "DISPATCHED"
    
    return get_trip_with_details(trip_id)


class RetryAssignmentRequest(BaseModel):
    """Request to retry hospital assignment with a different hospital."""
    new_hospital_id: str
    medico_bed_group_id: Optional[int] = None
    reason: Optional[str] = None


@router.post("/{trip_id}/retry-assignment", status_code=status.HTTP_200_OK)
async def retry_hospital_assignment(trip_id: str, request: RetryAssignmentRequest):
    """
    Retry hospital assignment for a failed trip.
    
    Use this when:
    - MEDICO rejected the initial hospital (no beds)
    - Dispatcher wants to choose a different hospital
    
    Only works for trips in ASSIGNMENT_FAILED state.
    """
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    
    # Only allow retry for failed assignments
    if trip['state'] != TripState.ASSIGNMENT_FAILED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trip is in state {trip['state']}. Retry only allowed for ASSIGNMENT_FAILED trips."
        )
    
    # Validate new hospital
    if request.new_hospital_id not in HOSPITALS_DB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown hospital: {request.new_hospital_id}"
        )
    
    # Attempt MEDICO assignment with new hospital
    medico_emergency_id = trip.get('medico_emergency_id')
    if medico_emergency_id and request.medico_bed_group_id:
        try:
            from amb.integrations.medico_client import get_medico_client, MedicoAPIError
            
            # Use proper mapping from shared hospital data
            medico_hospital_id = amb_id_to_medico_id(request.new_hospital_id)
            if medico_hospital_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Hospital {request.new_hospital_id} has no MEDICO mapping"
                )
            
            async with get_medico_client() as client:
                assignment = await client.assign_hospital(
                    emergency_id=medico_emergency_id,
                    hospital_id=medico_hospital_id,
                    bed_group_id=request.medico_bed_group_id,
                    reason=request.reason or "Retry after initial assignment failed",
                )
                
                # Update trip with new assignment
                trip['hospital_id'] = request.new_hospital_id
                trip['state'] = TripState.PENDING.value
                trip['assignment_error'] = None
                trip['medico_hospital_id'] = assignment.hospital_id
                trip['medico_hospital_name'] = assignment.hospital_name
                trip['medico_ward_type'] = assignment.ward_type
                trip['updated_at'] = datetime.now().isoformat()
                
                trip_logger.info(f"Trip {trip_id} retry successful: new hospital {assignment.hospital_name}")
                
                return get_trip_with_details(trip_id)
                
        except MedicoAPIError as e:
            trip_logger.warning(f"Retry assignment failed for {trip_id}: {e.detail}")
            trip['assignment_error'] = str(e.detail)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": "retry_assignment_failed",
                    "message": f"MEDICO rejected: {e.detail}",
                    "trip_id": trip_id,
                    "new_hospital_id": request.new_hospital_id,
                }
            )
    else:
        # No MEDICO integration - just update hospital
        trip['hospital_id'] = request.new_hospital_id
        trip['state'] = TripState.PENDING.value
        trip['assignment_error'] = None
        trip['updated_at'] = datetime.now().isoformat()
        
        return get_trip_with_details(trip_id)


@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: str):
    """Get trip details"""
    trip = get_trip_with_details(trip_id)
    if not trip:
        raise HTTPException(404, "Trip not found")
    return trip


@router.put("/{trip_id}/accept")
async def accept_trip(trip_id: str, current_amb=Depends(get_current_ambulance)):
    """Driver accepts trip assignment"""
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    if trip['ambulance_id'] != current_amb['ambulance_id']:
        raise HTTPException(403, "Not your trip")
    
    trip['state'] = TripState.EN_ROUTE_TO_SCENE.value
    trip['updated_at'] = datetime.now().isoformat()
    AMBULANCE_STATES[trip['ambulance_id']] = "EN_ROUTE_TO_SCENE"
    
    # Activate green corridor for high severity
    severity = trip.get('severity', 'HIGH')
    if severity in ['HIGH', 'CRITICAL']:
        get_corridor_ahead(trip['ambulance_id'], severity)
    
    return get_trip_with_details(trip_id)


@router.put("/{trip_id}/arrive-scene")
async def arrive_at_scene(trip_id: str, current_amb=Depends(get_current_ambulance)):
    """Driver arrived at accident scene"""
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    if trip['ambulance_id'] != current_amb['ambulance_id']:
        raise HTTPException(403, "Not your trip")
    
    trip['state'] = TripState.AT_SCENE.value
    trip['updated_at'] = datetime.now().isoformat()
    AMBULANCE_STATES[trip['ambulance_id']] = "AT_SCENE"
    
    return get_trip_with_details(trip_id)


@router.put("/{trip_id}/patient-onboard")
async def patient_onboard(trip_id: str, current_amb=Depends(get_current_ambulance)):
    """Driver confirms patient picked up (Phase 8)"""
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    if trip['ambulance_id'] != current_amb['ambulance_id']:
        raise HTTPException(403, "Not your trip")
    
    trip['state'] = TripState.EN_ROUTE_TO_HOSPITAL.value
    trip['updated_at'] = datetime.now().isoformat()
    AMBULANCE_STATES[trip['ambulance_id']] = "PATIENT_ONBOARD"
    
    # Continue green corridor to hospital (Phase 9)
    severity = trip.get('severity', 'HIGH')
    get_corridor_ahead(trip['ambulance_id'], severity)
    
    return get_trip_with_details(trip_id)


@router.put("/{trip_id}/arrive-hospital")
async def arrive_at_hospital(trip_id: str, current_amb=Depends(get_current_ambulance)):
    """Driver arrived at hospital"""
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    if trip['ambulance_id'] != current_amb['ambulance_id']:
        raise HTTPException(403, "Not your trip")
    
    trip['state'] = TripState.AT_HOSPITAL.value
    trip['updated_at'] = datetime.now().isoformat()
    AMBULANCE_STATES[trip['ambulance_id']] = "AT_HOSPITAL"
    
    return get_trip_with_details(trip_id)


@router.put("/{trip_id}/complete")
async def complete_trip(trip_id: str, current_amb=Depends(get_current_ambulance)):
    """
    Driver completes trip (Phase 11).
    
    WORKFLOW:
    1. Mark trip as COMPLETED
    2. Clear signal priorities
    3. If MEDICO emergency exists, call resolve_emergency()
    4. MEDICO handles bed release and notifications
    """
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    if trip['ambulance_id'] != current_amb['ambulance_id']:
        raise HTTPException(403, "Not your trip")
    
    trip['state'] = TripState.COMPLETED.value
    trip['updated_at'] = datetime.now().isoformat()
    AMBULANCE_STATES[trip['ambulance_id']] = "AVAILABLE"
    
    # Clear signal priorities for this ambulance
    amb_id = trip['ambulance_id']
    for sig_id, fsm in SIGNAL_STORE.items():
        if fsm.current_owner == amb_id:
            fsm.reset()
    
    # Resolve emergency in MEDICO (if integrated)
    medico_emergency_id = trip.get('medico_emergency_id')
    if medico_emergency_id:
        try:
            from amb.integrations.medico_client import get_medico_client
            
            async with get_medico_client() as client:
                await client.resolve_emergency(
                    emergency_id=medico_emergency_id,
                    resolution_notes=f"Patient delivered by ambulance {amb_id}. Trip {trip_id} completed.",
                )
                trip_logger.info(
                    f"MEDICO emergency {medico_emergency_id} resolved for trip {trip_id}"
                )
        except Exception as e:
            # Log error but don't fail the trip completion
            trip_logger.error(f"Failed to resolve MEDICO emergency: {e}")
            trip['medico_resolve_error'] = str(e)
    
    return {"status": "completed", "trip_id": trip_id}


@router.get("/{trip_id}/route-signals")
async def get_trip_route_signals(trip_id: str, current_amb=Depends(get_current_ambulance)):
    """Get signals along trip route with their states (Phase 6)"""
    if trip_id not in TRIPS:
        raise HTTPException(404, "Trip not found")
    
    trip = TRIPS[trip_id]
    severity = trip.get('severity', 'HIGH')
    amb_id = trip['ambulance_id']
    
    corridor = get_corridor_ahead(amb_id, severity)
    
    result = []
    for sig_id in corridor:
        fsm = get_or_init_signal(sig_id)
        
        # Get signal position
        lat, lng = SIGNAL_POSITIONS.get(sig_id, (0, 0))
        
        # Calculate distance if ambulance has GPS
        dist = 999.0
        if amb_id in GPS_STORE:
            gps = GPS_STORE[amb_id]
            dist = ((gps.lat - lat) ** 2 + (gps.lng - lng) ** 2) ** 0.5 * 111
        
        result.append({
            "signal_id": sig_id,
            "state": fsm.current_state.value,
            "is_green": fsm.current_state == SignalState.GREEN_FOR_AMBULANCE,
            "distance_km": round(dist, 3),
            "lat": lat,
            "lng": lng,
            "reason": fsm.history[-1][1].reason if fsm.history else "Idle",
        })
    
    return result


# ─────────────────────────────────────────────────────────────
# HOSPITAL ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/hospitals/all")
async def list_hospitals():
    """Get all hospitals"""
    return list(HOSPITALS_DB.values())


@router.get("/hospitals/{hospital_id}")
async def get_hospital(hospital_id: str):
    """Get hospital details"""
    if hospital_id not in HOSPITALS_DB:
        raise HTTPException(404, "Hospital not found")
    return HOSPITALS_DB[hospital_id]
