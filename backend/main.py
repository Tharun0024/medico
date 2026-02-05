"""
MEDICO Demo Backend - Stable, In-Memory, Demo-Friendly
No database, no auth, no tokens - just smooth demo experience.
Run with: uvicorn main:app --reload --host 127.0.0.1 --port 8000
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import uuid
import json

# =============================================================================
# APP SETUP
# =============================================================================

app = FastAPI(
    title="MEDICO Demo Backend",
    description="Demo-friendly backend for hospital management and ambulance coordination",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# ENUMS
# =============================================================================

class Role(str, Enum):
    CONTROL_ROOM = "control_room"
    AMBULANCE_DRIVER = "ambulance_driver"
    NORMAL_USER = "normal_user"
    HOSPITAL_ADMIN = "hospital_admin"
    MEDICAL_STAFF = "medical_staff"
    SUPER_ADMIN = "super_admin"
    EMERGENCY_SERVICE = "emergency_service"
    WASTE_TEAM = "waste_team"

class EmergencySeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NORMAL = "normal"

class EmergencyStatus(str, Enum):
    CREATED = "created"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"

class AmbulanceStatus(str, Enum):
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    EN_ROUTE = "en_route"

class TripStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class SignalState(str, Enum):
    RED = "red"
    GREEN = "green"
    YELLOW = "yellow"

class BedStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"

class WardType(str, Enum):
    ICU = "icu"
    HDU = "hdu"
    GENERAL = "general"

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class Hospital(BaseModel):
    id: int
    name: str
    city: str
    status: str = "active"
    lat: float = 0.0
    lng: float = 0.0
    icu_total: int = 30
    icu_available: int = 10
    hdu_total: int = 45
    hdu_available: int = 15
    general_total: int = 150
    general_available: int = 50
    created_at: str = ""

class Bed(BaseModel):
    id: int
    hospital_id: int
    ward_type: str
    bed_number: str
    status: str = "available"
    patient_id: Optional[int] = None

class Emergency(BaseModel):
    id: int
    severity: str
    status: str = "created"
    hospital_id: Optional[int] = None
    ambulance_id: Optional[str] = None
    bed_id: Optional[int] = None
    location_lat: float = 0.0
    location_lng: float = 0.0
    notes: Optional[str] = None
    created_at: str = ""
    assigned_at: Optional[str] = None
    resolved_at: Optional[str] = None

class Ambulance(BaseModel):
    id: str
    name: str
    status: str = "available"
    lat: float = 0.0
    lng: float = 0.0
    current_trip_id: Optional[int] = None
    driver_name: Optional[str] = None
    last_updated: str = ""

class Trip(BaseModel):
    id: int
    ambulance_id: Optional[str] = None
    emergency_id: Optional[int] = None
    hospital_id: Optional[int] = None
    status: str = "pending"
    pickup_lat: float = 0.0
    pickup_lng: float = 0.0
    destination_lat: float = 0.0
    destination_lng: float = 0.0
    created_at: str = ""
    accepted_at: Optional[str] = None
    completed_at: Optional[str] = None

class Signal(BaseModel):
    id: str
    name: str
    lat: float = 0.0
    lng: float = 0.0
    state: str = "red"
    corridor_active: bool = False
    last_updated: str = ""

class Patient(BaseModel):
    id: int
    hospital_id: int
    name: str
    age: int
    gender: str
    ward_type: str
    bed_id: Optional[int] = None
    status: str = "admitted"
    diagnosis: Optional[str] = None
    severity: str = "medium"
    admitted_at: str = ""
    discharged_at: Optional[str] = None

class WasteRequest(BaseModel):
    id: str
    hospital_id: int
    reported_waste_kg: float
    urgency: str = "normal"
    status: str = "requested"
    notes: Optional[str] = None
    requested_at: str = ""
    collected_at: Optional[str] = None
    disposed_at: Optional[str] = None

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class EmergencyCreateRequest(BaseModel):
    severity: str = "normal"
    location_lat: float = 0.0
    location_lng: float = 0.0
    notes: Optional[str] = None

class EmergencyAssignRequest(BaseModel):
    hospital_id: int
    ambulance_id: Optional[str] = None
    ward_type: Optional[str] = None

class AmbulanceRegisterRequest(BaseModel):
    name: Optional[str] = None
    driver_name: Optional[str] = None
    driver_id: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    phone: Optional[str] = None
    ambulance_id: Optional[str] = None  # For login
    secret: Optional[str] = None  # For login (ignored in demo mode)

class AmbulanceUpdateRequest(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    status: Optional[str] = None

class GPSStartRequest(BaseModel):
    ambulance_id: str
    trip_id: Optional[int] = None

class CorridorUpdateRequest(BaseModel):
    signal_ids: List[str]
    state: str = "green"
    ambulance_id: Optional[str] = None

class PatientAdmitRequest(BaseModel):
    name: str = "Patient"
    age: int = 30
    gender: str = "Unknown"
    ward_type: str = "general"
    diagnosis: Optional[str] = None
    severity: str = "medium"
    emergency_id: Optional[int] = None

class WastePickupRequest(BaseModel):
    urgency: str = "normal"
    notes: Optional[str] = None

# =============================================================================
# IN-MEMORY STORAGE - UNIFIED AppState (Single Source of Truth)
# =============================================================================

def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

# =============================================================================
# AMBULANCE REGISTRY - Authoritative ambulance identity source
# Key: ambulance_id (string) - MUST be the SAME everywhere
# =============================================================================
AMBULANCE_REGISTRY: Dict[str, Dict[str, Any]] = {}

# Initialize sample data
hospitals_db: Dict[int, Hospital] = {}
beds_db: Dict[int, Bed] = {}
emergencies_db: Dict[int, Emergency] = {}
ambulances_db: Dict[str, Ambulance] = {}  # Points to same data as AMBULANCE_REGISTRY
trips_db: Dict[int, Trip] = {}
signals_db: Dict[str, Signal] = {}
patients_db: Dict[int, Patient] = {}
waste_requests_db: Dict[str, WasteRequest] = {}

# Counters
emergency_counter = 0
trip_counter = 0
bed_counter = 0
patient_counter = 0

def init_sample_data():
    global emergency_counter, trip_counter, bed_counter, patient_counter
    
    # ==========================================================================
    # AMBULANCE REGISTRY - Single source of truth for ambulance identity
    # Each ambulance_id MUST be unique and consistent across ALL endpoints
    # ==========================================================================
    ambulance_secrets = {
        "AMB_001": "sec-amb-001",
        "AMB_002": "sec-amb-002", 
        "AMB_003": "sec-amb-003",
        "AMB_004": "sec-amb-004",
        "AMB_005": "sec-amb-005",
        "AMB-001": "secret-001",
        "AMB-002": "secret-002",
        "AMB-003": "secret-003",
        "AMB-004": "secret-004",
        "AMB-005": "secret-005",
        "AMB-006": "secret-006",
        "AMB-007": "secret-007",
        "AMB-008": "secret-008",
    }
    
    # Initialize AMBULANCE_REGISTRY with all valid ambulances
    for amb_id, secret in ambulance_secrets.items():
        AMBULANCE_REGISTRY[amb_id] = {
            "ambulance_id": amb_id,
            "secret": secret,
            "status": "available",
            "current_trip_id": None,
            "location": {"lat": 13.0827, "lng": 80.2707},
            "driver_name": f"Driver {amb_id}",
            "name": f"Ambulance {amb_id}",
            "last_updated": now_iso(),
        }
    
    # Sample Hospitals
    sample_hospitals = [
        Hospital(id=1, name="City General Hospital", city="Metro City", lat=12.9716, lng=77.5946, icu_total=30, icu_available=8, hdu_total=45, hdu_available=12, general_total=150, general_available=45, created_at=now_iso()),
        Hospital(id=2, name="Metro Medical Center", city="Metro City", lat=12.9816, lng=77.6046, icu_total=35, icu_available=5, hdu_total=50, hdu_available=18, general_total=180, general_available=62, created_at=now_iso()),
        Hospital(id=3, name="Green Valley Hospital", city="Green Valley", lat=12.9616, lng=77.5846, icu_total=25, icu_available=10, hdu_total=40, hdu_available=15, general_total=120, general_available=38, created_at=now_iso()),
        Hospital(id=4, name="Sunrise Healthcare", city="Sunrise District", lat=12.9516, lng=77.5746, icu_total=28, icu_available=6, hdu_total=42, hdu_available=10, general_total=140, general_available=52, created_at=now_iso()),
        Hospital(id=5, name="Apollo Healthcare", city="Central District", lat=12.9916, lng=77.6146, icu_total=32, icu_available=4, hdu_total=48, hdu_available=8, general_total=160, general_available=48, created_at=now_iso()),
        Hospital(id=6, name="Unity Medical Center", city="Metro City", lat=12.9416, lng=77.5646, icu_total=30, icu_available=9, hdu_total=45, hdu_available=14, general_total=145, general_available=55, created_at=now_iso()),
        Hospital(id=7, name="Lakeside Hospital", city="Lakeside", lat=12.9316, lng=77.5546, status="maintenance", icu_total=20, icu_available=8, hdu_total=35, hdu_available=15, general_total=100, general_available=40, created_at=now_iso()),
        Hospital(id=8, name="Central District Hospital", city="Central District", lat=13.0016, lng=77.6246, icu_total=40, icu_available=12, hdu_total=55, hdu_available=20, general_total=205, general_available=75, created_at=now_iso()),
    ]
    for h in sample_hospitals:
        hospitals_db[h.id] = h
    
    # Sample Beds for each hospital
    bed_id = 1
    for h_id, hospital in hospitals_db.items():
        for i in range(hospital.icu_total):
            status = "available" if i < hospital.icu_available else "occupied"
            beds_db[bed_id] = Bed(id=bed_id, hospital_id=h_id, ward_type="icu", bed_number=f"ICU-{i+1}", status=status)
            bed_id += 1
        for i in range(hospital.hdu_total):
            status = "available" if i < hospital.hdu_available else "occupied"
            beds_db[bed_id] = Bed(id=bed_id, hospital_id=h_id, ward_type="hdu", bed_number=f"HDU-{i+1}", status=status)
            bed_id += 1
        for i in range(hospital.general_total):
            status = "available" if i < hospital.general_available else "occupied"
            beds_db[bed_id] = Bed(id=bed_id, hospital_id=h_id, ward_type="general", bed_number=f"GEN-{i+1}", status=status)
            bed_id += 1
    bed_counter = bed_id
    
    # Sample Ambulances - MUST match AMBULANCE_REGISTRY keys exactly
    sample_ambulances = [
        Ambulance(id="AMB-001", name="Ambulance Alpha", status="available", lat=12.9750, lng=77.5900, driver_name="John Smith", last_updated=now_iso()),
        Ambulance(id="AMB-002", name="Ambulance Beta", status="available", lat=12.9800, lng=77.6000, driver_name="Jane Doe", last_updated=now_iso()),
        Ambulance(id="AMB-003", name="Ambulance Gamma", status="available", lat=12.9650, lng=77.5800, driver_name="Mike Johnson", last_updated=now_iso()),
        Ambulance(id="AMB-004", name="Ambulance Delta", status="available", lat=12.9550, lng=77.5700, driver_name="Sarah Williams", last_updated=now_iso()),
        Ambulance(id="AMB-005", name="Ambulance Echo", status="available", lat=12.9850, lng=77.6100, driver_name="David Brown", last_updated=now_iso()),
        Ambulance(id="AMB-006", name="Ambulance Foxtrot", status="offline", lat=12.9450, lng=77.5600, driver_name="Emily Davis", last_updated=now_iso()),
        Ambulance(id="AMB-007", name="Ambulance Golf", status="available", lat=12.9950, lng=77.6200, driver_name="Chris Wilson", last_updated=now_iso()),
        Ambulance(id="AMB-008", name="Ambulance Hotel", status="available", lat=12.9350, lng=77.5500, driver_name="Lisa Anderson", last_updated=now_iso()),
        # Flutter app compatible format - MUST have matching AMBULANCE_REGISTRY entries
        Ambulance(id="AMB_001", name="Demo Ambulance 1", status="available", lat=13.0827, lng=80.2707, driver_name="Demo Driver 1", last_updated=now_iso()),
        Ambulance(id="AMB_002", name="Demo Ambulance 2", status="available", lat=13.0627, lng=80.2507, driver_name="Demo Driver 2", last_updated=now_iso()),
        Ambulance(id="AMB_003", name="Demo Ambulance 3", status="available", lat=13.0527, lng=80.2407, driver_name="Demo Driver 3", last_updated=now_iso()),
        Ambulance(id="AMB_004", name="Demo Ambulance 4", status="available", lat=13.0427, lng=80.2307, driver_name="Demo Driver 4", last_updated=now_iso()),
        Ambulance(id="AMB_005", name="Demo Ambulance 5", status="available", lat=13.0327, lng=80.2207, driver_name="Demo Driver 5", last_updated=now_iso()),
    ]
    for a in sample_ambulances:
        ambulances_db[a.id] = a
        # Sync with AMBULANCE_REGISTRY
        if a.id in AMBULANCE_REGISTRY:
            AMBULANCE_REGISTRY[a.id]["status"] = a.status
            AMBULANCE_REGISTRY[a.id]["location"] = {"lat": a.lat, "lng": a.lng}
            AMBULANCE_REGISTRY[a.id]["driver_name"] = a.driver_name
            AMBULANCE_REGISTRY[a.id]["name"] = a.name
            AMBULANCE_REGISTRY[a.id]["last_updated"] = a.last_updated
    
    # Sample Signals
    sample_signals = [
        Signal(id="SIG-001", name="Main Street Junction", lat=12.9720, lng=77.5950, state="red", last_updated=now_iso()),
        Signal(id="SIG-002", name="Hospital Road Crossing", lat=12.9750, lng=77.5980, state="green", last_updated=now_iso()),
        Signal(id="SIG-003", name="Central Avenue", lat=12.9780, lng=77.6010, state="red", last_updated=now_iso()),
        Signal(id="SIG-004", name="Park Street", lat=12.9700, lng=77.5920, state="yellow", last_updated=now_iso()),
        Signal(id="SIG-005", name="Metro Junction", lat=12.9820, lng=77.6050, state="red", last_updated=now_iso()),
        Signal(id="SIG-006", name="University Road", lat=12.9680, lng=77.5880, state="green", last_updated=now_iso()),
        Signal(id="SIG-007", name="Industrial Area Gate", lat=12.9620, lng=77.5820, state="red", last_updated=now_iso()),
        Signal(id="SIG-008", name="Railway Crossing", lat=12.9580, lng=77.5760, state="red", last_updated=now_iso()),
    ]
    for s in sample_signals:
        signals_db[s.id] = s
    
    # Sample Trips - CRITICAL: Update AMBULANCE_REGISTRY.current_trip_id for assigned trips
    trip_counter = 1
    sample_trips = [
        Trip(id=1, ambulance_id="AMB-002", hospital_id=1, status="in_progress", pickup_lat=12.9700, pickup_lng=77.5900, destination_lat=12.9716, destination_lng=77.5946, created_at=now_iso()),
        Trip(id=2, ambulance_id="AMB-004", hospital_id=2, status="accepted", pickup_lat=12.9600, pickup_lng=77.5800, destination_lat=12.9816, destination_lng=77.6046, created_at=now_iso()),
        Trip(id=3, ambulance_id=None, hospital_id=3, status="pending", pickup_lat=12.9500, pickup_lng=77.5700, destination_lat=12.9616, destination_lng=77.5846, created_at=now_iso()),
    ]
    for t in sample_trips:
        trips_db[t.id] = t
        trip_counter = max(trip_counter, t.id + 1)
        
        # CRITICAL: Sync trip assignments to AMBULANCE_REGISTRY and ambulances_db
        if t.ambulance_id and t.status in ["pending", "accepted", "in_progress"]:
            if t.ambulance_id in AMBULANCE_REGISTRY:
                AMBULANCE_REGISTRY[t.ambulance_id]["current_trip_id"] = t.id
                AMBULANCE_REGISTRY[t.ambulance_id]["status"] = "en_route" if t.status in ["accepted", "in_progress"] else "available"
            if t.ambulance_id in ambulances_db:
                ambulances_db[t.ambulance_id].current_trip_id = t.id
                ambulances_db[t.ambulance_id].status = "en_route" if t.status in ["accepted", "in_progress"] else "available"
    
    # Sample Emergencies
    emergency_counter = 1
    sample_emergencies = [
        Emergency(id=1, severity="critical", status="assigned", hospital_id=1, ambulance_id="AMB-002", location_lat=12.9700, location_lng=77.5900, notes="MVA - multiple injuries", created_at=now_iso(), assigned_at=now_iso()),
        Emergency(id=2, severity="high", status="in_progress", hospital_id=2, ambulance_id="AMB-004", location_lat=12.9600, location_lng=77.5800, notes="Cardiac arrest", created_at=now_iso(), assigned_at=now_iso()),
        Emergency(id=3, severity="normal", status="created", location_lat=12.9500, location_lng=77.5700, notes="Minor injuries", created_at=now_iso()),
    ]
    for e in sample_emergencies:
        emergencies_db[e.id] = e
        emergency_counter = max(emergency_counter, e.id + 1)
    
    # Sample Patients
    patient_counter = 1
    sample_patients = [
        Patient(id=1, hospital_id=1, name="John Doe", age=65, gender="Male", ward_type="icu", status="in_treatment", diagnosis="Cardiac arrhythmia", severity="high", admitted_at=now_iso()),
        Patient(id=2, hospital_id=1, name="Jane Smith", age=42, gender="Female", ward_type="hdu", status="assigned", diagnosis="Post-surgical recovery", severity="medium", admitted_at=now_iso()),
        Patient(id=3, hospital_id=1, name="Robert Johnson", age=58, gender="Male", ward_type="general", status="in_treatment", diagnosis="Pneumonia", severity="medium", admitted_at=now_iso()),
    ]
    for p in sample_patients:
        patients_db[p.id] = p
        patient_counter = max(patient_counter, p.id + 1)

init_sample_data()

# =============================================================================
# WEBSOCKET MANAGER
# =============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)
    
    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            if websocket in self.active_connections[channel]:
                self.active_connections[channel].remove(websocket)
    
    async def broadcast(self, channel: str, message: dict):
        if channel in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[channel]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.append(connection)
            for dc in dead_connections:
                self.disconnect(dc, channel)
    
    async def broadcast_all(self, message: dict):
        for channel in self.active_connections:
            await self.broadcast(channel, message)

manager = ConnectionManager()

# =============================================================================
# RBAC DEPENDENCY (Simple, No Auth)
# =============================================================================

def get_role(x_role: Optional[str] = Header(None, alias="X-Role")) -> str:
    return x_role or "normal_user"

def get_hospital_id(x_hospital_id: Optional[str] = Header(None, alias="X-Hospital-ID")) -> Optional[int]:
    if x_hospital_id:
        try:
            return int(x_hospital_id)
        except:
            return None
    return None

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def find_best_hospital(severity: str) -> Optional[Hospital]:
    active_hospitals = [h for h in hospitals_db.values() if h.status == "active"]
    if not active_hospitals:
        return None
    if severity == "critical":
        candidates = [h for h in active_hospitals if h.icu_available > 0]
        if candidates:
            return min(candidates, key=lambda h: h.icu_available, default=candidates[0])
    elif severity in ["high", "medium"]:
        candidates = [h for h in active_hospitals if h.hdu_available > 0 or h.general_available > 0]
        if candidates:
            return max(candidates, key=lambda h: h.hdu_available + h.general_available)
    else:
        candidates = [h for h in active_hospitals if h.general_available > 0]
        if candidates:
            return candidates[0]
    return active_hospitals[0] if active_hospitals else None

def reserve_bed(hospital_id: int, ward_type: str) -> Optional[Bed]:
    hospital = hospitals_db.get(hospital_id)
    if not hospital:
        return None
    for bed in beds_db.values():
        if bed.hospital_id == hospital_id and bed.ward_type == ward_type and bed.status == "available":
            bed.status = "reserved"
            if ward_type == "icu":
                hospital.icu_available = max(0, hospital.icu_available - 1)
            elif ward_type == "hdu":
                hospital.hdu_available = max(0, hospital.hdu_available - 1)
            else:
                hospital.general_available = max(0, hospital.general_available - 1)
            return bed
    return None

def get_ward_for_severity(severity: str) -> str:
    if severity == "critical":
        return "icu"
    elif severity in ["high", "medium"]:
        return "hdu"
    return "general"

# =============================================================================
# WEBSOCKET ENDPOINTS
# =============================================================================

@app.websocket("/ws")
async def websocket_main(websocket: WebSocket, role: Optional[str] = None, hospital_id: Optional[int] = None):
    """WebSocket endpoint for frontend real-time updates (query params style)"""
    channel = role or "default"
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                await manager.broadcast(channel, {"type": "message", "data": msg})
            except:
                await websocket.send_json({"type": "ack", "message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                await manager.broadcast(channel, {"type": "message", "data": msg})
            except:
                await websocket.send_json({"type": "ack", "message": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

# =============================================================================
# CONTROL ROOM DASHBOARD ENDPOINTS
# =============================================================================

@app.get("/dashboard/overview")
async def dashboard_overview():
    active_emergencies = [e for e in emergencies_db.values() if e.status != "resolved"]
    available_ambulances = [a for a in ambulances_db.values() if a.status == "available"]
    active_trips = [t for t in trips_db.values() if t.status in ["pending", "accepted", "in_progress"]]
    total_beds = sum(h.icu_total + h.hdu_total + h.general_total for h in hospitals_db.values())
    available_beds = sum(h.icu_available + h.hdu_available + h.general_available for h in hospitals_db.values())
    return {
        "total_hospitals": len(hospitals_db),
        "active_hospitals": len([h for h in hospitals_db.values() if h.status == "active"]),
        "total_ambulances": len(ambulances_db),
        "available_ambulances": len(available_ambulances),
        "active_emergencies": len(active_emergencies),
        "pending_emergencies": len([e for e in active_emergencies if e.status == "created"]),
        "active_trips": len(active_trips),
        "total_beds": total_beds,
        "available_beds": available_beds,
        "occupancy_rate": round((total_beds - available_beds) / total_beds * 100, 1) if total_beds > 0 else 0,
        "emergencies": [e.dict() for e in list(active_emergencies)[:10]],
        "recent_trips": [t.dict() for t in list(active_trips)[:10]],
    }

@app.get("/dashboard/ambulances")
async def dashboard_ambulances():
    return {
        "ambulances": [a.dict() for a in ambulances_db.values()],
        "total": len(ambulances_db),
        "available": len([a for a in ambulances_db.values() if a.status == "available"]),
        "busy": len([a for a in ambulances_db.values() if a.status == "busy"]),
        "en_route": len([a for a in ambulances_db.values() if a.status == "en_route"]),
        "offline": len([a for a in ambulances_db.values() if a.status == "offline"]),
    }

@app.get("/dashboard/signals")
async def dashboard_signals():
    return {
        "signals": [s.dict() for s in signals_db.values()],
        "total": len(signals_db),
        "green": len([s for s in signals_db.values() if s.state == "green"]),
        "red": len([s for s in signals_db.values() if s.state == "red"]),
        "yellow": len([s for s in signals_db.values() if s.state == "yellow"]),
        "corridor_active": len([s for s in signals_db.values() if s.corridor_active]),
    }

# =============================================================================
# TRIPS ENDPOINTS
# =============================================================================

@app.get("/trips")
async def get_trips(status: Optional[str] = None):
    trips = list(trips_db.values())
    if status:
        trips = [t for t in trips if t.status == status]
    return {"trips": [t.dict() for t in trips], "total": len(trips)}

@app.post("/trips/{trip_id}/accept")
async def accept_trip(trip_id: int, ambulance_id: Optional[str] = None):
    """
    Accept a trip.
    CRITICAL: Updates AMBULANCE_REGISTRY.current_trip_id for Flutter sync.
    """
    trip = trips_db.get(trip_id)
    if not trip:
        return {"error": "Trip not found", "success": False}
    trip.status = "accepted"
    trip.accepted_at = now_iso()
    
    if ambulance_id:
        trip.ambulance_id = ambulance_id
        
        # Update ambulances_db
        if ambulance_id in ambulances_db:
            ambulances_db[ambulance_id].status = "en_route"
            ambulances_db[ambulance_id].current_trip_id = trip_id
            ambulances_db[ambulance_id].last_updated = now_iso()
        
        # Update AMBULANCE_REGISTRY (authoritative source)
        if ambulance_id in AMBULANCE_REGISTRY:
            AMBULANCE_REGISTRY[ambulance_id]["status"] = "en_route"
            AMBULANCE_REGISTRY[ambulance_id]["current_trip_id"] = trip_id
            AMBULANCE_REGISTRY[ambulance_id]["last_updated"] = now_iso()
    
    await manager.broadcast("trips", {"type": "trip_accepted", "data": trip.dict()})
    await manager.broadcast("ambulances", {"type": "ambulance_assigned", "ambulance_id": ambulance_id, "trip_id": trip_id})
    return {"success": True, "trip": trip.dict()}

@app.get("/trips/{trip_id}")
async def get_trip(trip_id: int):
    trip = trips_db.get(trip_id)
    if not trip:
        return {"error": "Trip not found"}
    return trip.dict()

@app.get("/trips/{trip_id}/route-signals")
async def get_trip_route_signals(trip_id: int):
    trip = trips_db.get(trip_id)
    if not trip:
        return {"signals": [], "trip_id": trip_id}
    return {"trip_id": trip_id, "signals": [s.dict() for s in list(signals_db.values())[:5]]}

# =============================================================================
# GPS ENDPOINTS
# =============================================================================

@app.post("/gps/start")
async def gps_start(request: GPSStartRequest):
    """
    Start GPS tracking for ambulance.
    CRITICAL: Updates AMBULANCE_REGISTRY for state sync.
    """
    ambulance = ambulances_db.get(request.ambulance_id)
    if not ambulance:
        return {"error": "Ambulance not found", "success": False}
    
    ambulance.status = "en_route"
    ambulance.last_updated = now_iso()
    if request.trip_id:
        ambulance.current_trip_id = request.trip_id
    
    # Update AMBULANCE_REGISTRY
    if request.ambulance_id in AMBULANCE_REGISTRY:
        AMBULANCE_REGISTRY[request.ambulance_id]["status"] = "en_route"
        AMBULANCE_REGISTRY[request.ambulance_id]["last_updated"] = now_iso()
        if request.trip_id:
            AMBULANCE_REGISTRY[request.ambulance_id]["current_trip_id"] = request.trip_id
    
    return {"success": True, "ambulance_id": request.ambulance_id, "tracking_started": True, "message": "GPS tracking started"}

@app.get("/gps/current")
async def gps_current(ambulance_id: Optional[str] = None):
    if ambulance_id:
        ambulance = ambulances_db.get(ambulance_id)
        if ambulance:
            return {"ambulance_id": ambulance.id, "lat": ambulance.lat, "lng": ambulance.lng, "status": ambulance.status, "last_updated": ambulance.last_updated}
        return {"error": "Ambulance not found"}
    return {"positions": [{"ambulance_id": a.id, "lat": a.lat, "lng": a.lng, "status": a.status} for a in ambulances_db.values()]}

# =============================================================================
# SIGNALS ENDPOINTS
# =============================================================================

@app.get("/signals/{signal_id}")
async def get_signal(signal_id: str):
    signal = signals_db.get(signal_id)
    if not signal:
        return {"id": signal_id, "name": f"Signal {signal_id}", "state": "red", "corridor_active": False, "last_updated": now_iso()}
    return signal.dict()

@app.get("/signals/{signal_id}/state")
async def get_signal_state(signal_id: str):
    signal = signals_db.get(signal_id)
    return {"signal_id": signal_id, "state": signal.state if signal else "red", "corridor_active": signal.corridor_active if signal else False}

@app.post("/corridor/update")
async def update_corridor(request: CorridorUpdateRequest):
    updated = []
    for signal_id in request.signal_ids:
        if signal_id in signals_db:
            signals_db[signal_id].state = request.state
            signals_db[signal_id].corridor_active = request.state == "green"
            signals_db[signal_id].last_updated = now_iso()
            updated.append(signal_id)
    await manager.broadcast("signals", {"type": "corridor_update", "signal_ids": updated, "state": request.state, "ambulance_id": request.ambulance_id})
    return {"success": True, "updated_signals": updated, "state": request.state}

# =============================================================================
# AMBULANCE ENDPOINTS
# =============================================================================

@app.post("/ambulance/register")
async def ambulance_register(request: AmbulanceRegisterRequest):
    """
    Ambulance login/register endpoint.
    CRITICAL: Returns access_token = ambulance_id for identity sync.
    """
    # Check if this is a login attempt (ambulance_id provided)
    if hasattr(request, 'ambulance_id') and request.ambulance_id:
        ambulance_id = request.ambulance_id
        
        # Validate against AMBULANCE_REGISTRY
        if ambulance_id in AMBULANCE_REGISTRY:
            registry_entry = AMBULANCE_REGISTRY[ambulance_id]
            
            # Validate secret (optional in demo mode - always succeed)
            # If secret is provided, it should match
            if request.secret and request.secret != registry_entry["secret"]:
                # In demo mode, we still allow login but log warning
                pass  # Demo mode: always succeed
            
            # CRITICAL: access_token = ambulance_id for identity sync
            # The token IS the ambulance_id so Flutter/Control Room stay in sync
            access_token = ambulance_id
            
            # Get or create ambulance in ambulances_db
            if ambulance_id not in ambulances_db:
                ambulances_db[ambulance_id] = Ambulance(
                    id=ambulance_id,
                    name=registry_entry["name"],
                    driver_name=registry_entry["driver_name"],
                    status=registry_entry["status"],
                    lat=registry_entry["location"]["lat"],
                    lng=registry_entry["location"]["lng"],
                    current_trip_id=registry_entry["current_trip_id"],
                    last_updated=now_iso()
                )
            
            ambulance = ambulances_db[ambulance_id]
            
            return {
                "success": True,
                "ambulance_id": ambulance_id,
                "access_token": access_token,  # CRITICAL: This IS the ambulance_id
                "token_type": "bearer",
                "ambulance": {
                    "id": ambulance.id,
                    "name": ambulance.name,
                    "driver_name": ambulance.driver_name,
                    "status": ambulance.status,
                    "current_trip_id": ambulance.current_trip_id,
                    "lat": ambulance.lat,
                    "lng": ambulance.lng,
                    "last_updated": ambulance.last_updated
                }
            }
        else:
            # Not in registry - demo mode: create new entry
            pass
    
    # Create new ambulance (registration mode)
    ambulance_id = request.ambulance_id or f"AMB-{str(uuid.uuid4())[:8].upper()}"
    name = request.name or f"Ambulance {ambulance_id[-4:]}"
    driver_name = request.driver_name or "Demo Driver"
    secret = request.secret or f"sec-{ambulance_id.lower()}"
    
    # Add to AMBULANCE_REGISTRY
    AMBULANCE_REGISTRY[ambulance_id] = {
        "ambulance_id": ambulance_id,
        "secret": secret,
        "status": "available",
        "current_trip_id": None,
        "location": {"lat": 13.0827, "lng": 80.2707},
        "driver_name": driver_name,
        "name": name,
        "last_updated": now_iso(),
    }
    
    ambulance = Ambulance(id=ambulance_id, name=name, driver_name=driver_name, status="available", last_updated=now_iso())
    ambulances_db[ambulance_id] = ambulance
    await manager.broadcast("ambulances", {"type": "ambulance_registered", "data": ambulance.dict()})
    
    # CRITICAL: access_token = ambulance_id
    return {
        "success": True,
        "ambulance_id": ambulance_id,
        "access_token": ambulance_id,  # Token IS the ambulance_id
        "token_type": "bearer",
        "ambulance": ambulance.dict()
    }

@app.get("/ambulance/me")
async def ambulance_me(authorization: Optional[str] = Header(None)):
    """
    Get current ambulance details from token.
    CRITICAL: Returns current_trip_id for Flutter to know its assigned trip.
    """
    ambulance_id = None
    
    if authorization:
        # Extract ambulance_id from Authorization header
        # Token format: "Bearer AMB_001" or "Bearer demo-token-AMB_001" or just "AMB_001"
        token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
        
        # Handle both legacy "demo-token-XXX" format and new direct ambulance_id format
        if token.startswith("demo-token-"):
            ambulance_id = token.replace("demo-token-", "")
        else:
            ambulance_id = token
    
    # Look up in AMBULANCE_REGISTRY first (authoritative source)
    if ambulance_id and ambulance_id in AMBULANCE_REGISTRY:
        registry_entry = AMBULANCE_REGISTRY[ambulance_id]
        ambulance = ambulances_db.get(ambulance_id)
        
        # Return unified response with current_trip_id
        return {
            "id": ambulance_id,
            "name": registry_entry["name"],
            "driver_name": registry_entry["driver_name"],
            "status": registry_entry["status"],
            "current_trip_id": registry_entry["current_trip_id"],  # CRITICAL for Flutter
            "plate_number": f"TN-{ambulance_id[-4:]}",
            "ambulance_type": "ALS",
            "lat": registry_entry["location"]["lat"],
            "lng": registry_entry["location"]["lng"],
            "last_updated": registry_entry["last_updated"]
        }
    
    # Fallback to ambulances_db
    if ambulance_id and ambulance_id in ambulances_db:
        amb = ambulances_db[ambulance_id]
        return {
            "id": amb.id,
            "name": amb.name,
            "driver_name": amb.driver_name,
            "status": amb.status,
            "current_trip_id": amb.current_trip_id,
            "plate_number": f"TN-{amb.id[-4:]}",
            "ambulance_type": "ALS",
            "lat": amb.lat,
            "lng": amb.lng,
            "last_updated": amb.last_updated
        }
    
    # Return first available ambulance for demo (should not happen in production)
    if ambulances_db:
        amb = list(ambulances_db.values())[0]
        return {
            "id": amb.id,
            "name": amb.name,
            "driver_name": amb.driver_name,
            "status": amb.status,
            "current_trip_id": amb.current_trip_id,
            "plate_number": f"TN-{amb.id[-4:]}",
            "ambulance_type": "ALS",
            "lat": amb.lat,
            "lng": amb.lng,
            "last_updated": amb.last_updated
        }
    
    return {"error": "No ambulance found", "id": None, "current_trip_id": None}

@app.post("/ambulance/update")
async def ambulance_update(ambulance_id: str = Query(...), request: AmbulanceUpdateRequest = None):
    ambulance = ambulances_db.get(ambulance_id)
    if not ambulance:
        return {"error": "Ambulance not found", "success": False}
    if request:
        if request.lat is not None:
            ambulance.lat = request.lat
        if request.lng is not None:
            ambulance.lng = request.lng
        if request.status is not None:
            ambulance.status = request.status
    ambulance.last_updated = now_iso()
    await manager.broadcast("ambulances", {"type": "ambulance_updated", "data": ambulance.dict()})
    return {"success": True, "ambulance": ambulance.dict()}

# =============================================================================
# HOSPITAL ENDPOINTS
# =============================================================================

@app.get("/hospital/list")
async def hospital_list():
    return {"hospitals": [h.dict() for h in hospitals_db.values()], "total": len(hospitals_db), "active": len([h for h in hospitals_db.values() if h.status == "active"])}

@app.get("/hospital/{hospital_id}")
async def get_hospital(hospital_id: int):
    hospital = hospitals_db.get(hospital_id)
    if not hospital:
        return {"error": "Hospital not found"}
    return hospital.dict()

@app.get("/hospital/{hospital_id}/beds")
async def hospital_beds(hospital_id: int, ward_type: Optional[str] = None):
    hospital = hospitals_db.get(hospital_id)
    if not hospital:
        return {"error": "Hospital not found", "beds": []}
    beds = [b for b in beds_db.values() if b.hospital_id == hospital_id]
    if ward_type:
        beds = [b for b in beds if b.ward_type == ward_type]
    return {"hospital_id": hospital_id, "hospital_name": hospital.name, "beds": [b.dict() for b in beds], "total": len(beds), "available": len([b for b in beds if b.status == "available"]), "occupied": len([b for b in beds if b.status == "occupied"]), "reserved": len([b for b in beds if b.status == "reserved"])}

# =============================================================================
# EMERGENCY ENDPOINTS
# =============================================================================

@app.post("/emergency/create")
async def emergency_create(request: EmergencyCreateRequest):
    global emergency_counter
    emergency_counter += 1
    emergency = Emergency(id=emergency_counter, severity=request.severity, status="created", location_lat=request.location_lat, location_lng=request.location_lng, notes=request.notes, created_at=now_iso())
    emergencies_db[emergency.id] = emergency
    suggested_hospital = find_best_hospital(request.severity)
    await manager.broadcast("emergencies", {"type": "emergency_created", "data": emergency.dict()})
    return {"success": True, "emergency": emergency.dict(), "suggested_hospital": suggested_hospital.dict() if suggested_hospital else None}

@app.get("/emergency/list")
async def emergency_list(status: Optional[str] = None, severity: Optional[str] = None):
    emergencies = list(emergencies_db.values())
    if status:
        emergencies = [e for e in emergencies if e.status == status]
    if severity:
        emergencies = [e for e in emergencies if e.severity == severity]
    return {"items": [e.dict() for e in emergencies], "total": len(emergencies), "created": len([e for e in emergencies if e.status == "created"]), "assigned": len([e for e in emergencies if e.status == "assigned"]), "in_progress": len([e for e in emergencies if e.status == "in_progress"]), "resolved": len([e for e in emergencies if e.status == "resolved"])}

@app.post("/emergency/assign/{emergency_id}")
async def emergency_assign(emergency_id: int, request: EmergencyAssignRequest):
    """
    Assign emergency to hospital and ambulance.
    CRITICAL: Updates AMBULANCE_REGISTRY.current_trip_id for Flutter sync.
    """
    global trip_counter
    emergency = emergencies_db.get(emergency_id)
    if not emergency:
        return {"error": "Emergency not found", "success": False}
    hospital = hospitals_db.get(request.hospital_id)
    if not hospital:
        return {"error": "Hospital not found", "success": False}
    ward_type = request.ward_type or get_ward_for_severity(emergency.severity)
    bed = reserve_bed(request.hospital_id, ward_type)
    emergency.status = "assigned"
    emergency.hospital_id = request.hospital_id
    emergency.assigned_at = now_iso()
    if bed:
        emergency.bed_id = bed.id
    
    # Create trip FIRST to get trip_id
    trip_counter += 1
    trip = Trip(
        id=trip_counter,
        ambulance_id=request.ambulance_id,
        emergency_id=emergency_id,
        hospital_id=request.hospital_id,
        status="pending",
        pickup_lat=emergency.location_lat,
        pickup_lng=emergency.location_lng,
        destination_lat=hospital.lat,
        destination_lng=hospital.lng,
        created_at=now_iso()
    )
    trips_db[trip.id] = trip
    
    # CRITICAL: Update ambulance with current_trip_id in BOTH stores
    if request.ambulance_id:
        emergency.ambulance_id = request.ambulance_id
        
        # Update ambulances_db
        if request.ambulance_id in ambulances_db:
            ambulances_db[request.ambulance_id].status = "en_route"
            ambulances_db[request.ambulance_id].current_trip_id = trip.id  # CRITICAL
            ambulances_db[request.ambulance_id].last_updated = now_iso()
        
        # Update AMBULANCE_REGISTRY (authoritative source)
        if request.ambulance_id in AMBULANCE_REGISTRY:
            AMBULANCE_REGISTRY[request.ambulance_id]["status"] = "en_route"
            AMBULANCE_REGISTRY[request.ambulance_id]["current_trip_id"] = trip.id  # CRITICAL
            AMBULANCE_REGISTRY[request.ambulance_id]["last_updated"] = now_iso()
    
    await manager.broadcast("emergencies", {"type": "emergency_assigned", "data": emergency.dict()})
    await manager.broadcast("hospitals", {"type": "bed_reserved", "hospital_id": request.hospital_id, "bed": bed.dict() if bed else None})
    await manager.broadcast("trips", {"type": "trip_created", "data": trip.dict()})
    await manager.broadcast("ambulances", {"type": "ambulance_assigned", "ambulance_id": request.ambulance_id, "trip_id": trip.id})
    
    return {"success": True, "emergency": emergency.dict(), "hospital": hospital.dict(), "bed": bed.dict() if bed else None, "trip": trip.dict()}

# =============================================================================
# AMB MODULE ENDPOINTS (for control_room_dashboard)
# =============================================================================

@app.get("/amb/dashboard/overview")
async def amb_dashboard_overview():
    return await dashboard_overview()

@app.get("/amb/dashboard/ambulances")
async def amb_dashboard_ambulances():
    return await dashboard_ambulances()

@app.get("/amb/trips")
async def amb_trips(status: Optional[str] = None):
    return await get_trips(status)

@app.get("/amb/trips/active")
async def amb_active_trips():
    active = [t for t in trips_db.values() if t.status in ["pending", "accepted", "in_progress"]]
    return {"trips": [t.dict() for t in active], "total": len(active)}

@app.get("/amb/trips/pending")
async def amb_pending_trips():
    pending = [t for t in trips_db.values() if t.status == "pending"]
    return {"trips": [t.dict() for t in pending], "total": len(pending)}

@app.post("/amb/trips/{trip_id}/accept")
async def amb_accept_trip(trip_id: int, ambulance_id: Optional[str] = None):
    return await accept_trip(trip_id, ambulance_id)

@app.get("/amb/emergencies")
async def amb_emergencies(status: Optional[str] = None):
    return await emergency_list(status)

@app.get("/amb/emergencies/pending")
async def amb_pending_emergencies():
    pending = [e for e in emergencies_db.values() if e.status == "created"]
    return {"emergencies": [e.dict() for e in pending], "total": len(pending)}

@app.get("/amb/dashboard/signals")
async def amb_dashboard_signals():
    return await dashboard_signals()

@app.get("/amb/dashboard/active-trips")
async def amb_dashboard_active_trips():
    active = [t for t in trips_db.values() if t.status in ["pending", "accepted", "in_progress"]]
    return {"trips": [t.dict() for t in active], "total": len(active)}

@app.get("/amb/dashboard/pending-cases")
async def amb_dashboard_pending_cases():
    pending = [e for e in emergencies_db.values() if e.status == "created"]
    return {"cases": [e.dict() for e in pending], "total": len(pending)}

@app.get("/amb/system/status")
async def amb_system_status():
    return {"status": "operational", "demo_mode": True, "version": "1.0.0", "uptime": "Demo Mode"}

@app.get("/amb/health")
async def amb_health():
    return {"status": "healthy", "demo_mode": True}

@app.post("/amb/trips/emergencies")
async def amb_create_trip_from_emergency(
    location_lat: float = 13.0827,
    location_lng: float = 80.2707,
    location_address: Optional[str] = None,
    emergency_type: Optional[str] = "General",
    severity: Optional[str] = "normal",
    description: Optional[str] = None,
    reported_victims: Optional[int] = 1,
    emergency_id: int = 0,
    hospital_id: int = 0,
    ambulance_id: Optional[str] = None
):
    global trip_counter, emergency_counter
    # Create emergency if not exists
    if emergency_id == 0:
        emergency_counter += 1
        emergency = Emergency(
            id=emergency_counter,
            severity=severity or "normal",
            status="created",
            location_lat=location_lat,
            location_lng=location_lng,
            notes=description or emergency_type,
            created_at=now_iso()
        )
        emergencies_db[emergency_counter] = emergency
        emergency_id = emergency_counter
    
    trip_counter += 1
    trip = Trip(id=trip_counter, ambulance_id=ambulance_id or "AMB-DEMO", emergency_id=emergency_id, hospital_id=hospital_id, status="pending", pickup_lat=location_lat, pickup_lng=location_lng, created_at=now_iso())
    trips_db[trip_counter] = trip
    return {"success": True, "trip": trip.dict(), "emergency_id": emergency_id}

@app.get("/amb/trips/emergencies")
async def amb_get_emergencies():
    return [e.dict() for e in emergencies_db.values()]

@app.get("/amb/trips/emergencies/pending")
async def amb_get_pending_emergencies():
    pending = [e for e in emergencies_db.values() if e.status == "created"]
    return [e.dict() for e in pending]

@app.get("/amb/ambulances")
async def amb_get_ambulances():
    return [a.dict() for a in ambulances_db.values()]

@app.get("/amb/ambulances/available")
async def amb_get_available_ambulances():
    available = [a for a in ambulances_db.values() if a.status == "available"]
    return [a.dict() for a in available]

@app.get("/amb/ambulances/{ambulance_id}")
async def amb_get_ambulance(ambulance_id: str):
    ambulance = ambulances_db.get(ambulance_id)
    if ambulance:
        return ambulance.dict()
    return {"error": "Ambulance not found"}

@app.post("/amb/ambulances/{ambulance_id}/location")
async def amb_update_ambulance_location(ambulance_id: str, lat: float = 0, lng: float = 0):
    ambulance = ambulances_db.get(ambulance_id)
    if ambulance:
        ambulance.lat = lat
        ambulance.lng = lng
        ambulance.last_updated = now_iso()
        return {"success": True, "ambulance": ambulance.dict()}
    return {"error": "Ambulance not found", "success": False}

@app.put("/amb/ambulances/{ambulance_id}/status")
async def amb_update_ambulance_status(ambulance_id: str, status: str = "available"):
    ambulance = ambulances_db.get(ambulance_id)
    if ambulance:
        ambulance.status = status
        ambulance.last_updated = now_iso()
        return {"success": True, "ambulance": ambulance.dict()}
    return {"error": "Ambulance not found", "success": False}

@app.get("/amb/trips/{trip_id}")
async def amb_get_trip(trip_id: int):
    trip = trips_db.get(trip_id)
    if trip:
        return trip.dict()
    return {"error": "Trip not found"}

@app.put("/amb/trips/{trip_id}/arrive-scene")
async def amb_trip_arrive_scene(trip_id: int):
    trip = trips_db.get(trip_id)
    if trip:
        trip.status = "at_scene"
        return {"success": True, "trip": trip.dict()}
    return {"error": "Trip not found", "success": False}

@app.put("/amb/trips/{trip_id}/patient-onboard")
async def amb_trip_patient_onboard(trip_id: int):
    trip = trips_db.get(trip_id)
    if trip:
        trip.status = "patient_onboard"
        return {"success": True, "trip": trip.dict()}
    return {"error": "Trip not found", "success": False}

@app.put("/amb/trips/{trip_id}/arrive-hospital")
async def amb_trip_arrive_hospital(trip_id: int):
    trip = trips_db.get(trip_id)
    if trip:
        trip.status = "at_hospital"
        return {"success": True, "trip": trip.dict()}
    return {"error": "Trip not found", "success": False}

@app.put("/amb/trips/{trip_id}/complete")
async def amb_trip_complete(trip_id: int):
    """
    Complete a trip.
    CRITICAL: Clears AMBULANCE_REGISTRY.current_trip_id to free ambulance.
    """
    trip = trips_db.get(trip_id)
    if trip:
        trip.status = "completed"
        trip.completed_at = now_iso()
        
        # CRITICAL: Clear current_trip_id from ambulance in BOTH stores
        if trip.ambulance_id:
            if trip.ambulance_id in ambulances_db:
                ambulances_db[trip.ambulance_id].status = "available"
                ambulances_db[trip.ambulance_id].current_trip_id = None
                ambulances_db[trip.ambulance_id].last_updated = now_iso()
            
            if trip.ambulance_id in AMBULANCE_REGISTRY:
                AMBULANCE_REGISTRY[trip.ambulance_id]["status"] = "available"
                AMBULANCE_REGISTRY[trip.ambulance_id]["current_trip_id"] = None
                AMBULANCE_REGISTRY[trip.ambulance_id]["last_updated"] = now_iso()
        
        await manager.broadcast("trips", {"type": "trip_completed", "data": trip.dict()})
        await manager.broadcast("ambulances", {"type": "ambulance_available", "ambulance_id": trip.ambulance_id})
        return {"success": True, "trip": trip.dict()}
    return {"error": "Trip not found", "success": False}

@app.get("/amb/trips/{trip_id}/route-signals")
async def amb_trip_route_signals(trip_id: int):
    # Return signals along the trip route
    return [s.dict() for s in signals_db.values()]

@app.get("/amb/trips/hospitals/all")
async def amb_get_hospitals():
    return [{"id": f"HOSP-{h.id:03d}", "name": h.name, "lat": h.lat, "lng": h.lng, "total_beds": h.icu_total + h.hdu_total + h.general_total, "available_beds": h.icu_available + h.hdu_available + h.general_available, "is_active": h.status == "active"} for h in hospitals_db.values()]

@app.post("/amb/ambulance/register")
async def amb_ambulance_register(ambulance_id: Optional[str] = None, secret: Optional[str] = None, name: Optional[str] = None, driver_name: Optional[str] = None):
    """
    Ambulance registration endpoint for Flutter app.
    CRITICAL: Uses AMBULANCE_REGISTRY for identity sync.
    """
    # Check if this is a login attempt
    if ambulance_id:
        # Validate against AMBULANCE_REGISTRY first
        if ambulance_id in AMBULANCE_REGISTRY:
            registry_entry = AMBULANCE_REGISTRY[ambulance_id]
            # CRITICAL: access_token = ambulance_id for identity sync
            return {
                "success": True,
                "ambulance_id": ambulance_id,
                "access_token": ambulance_id,  # Token IS the ambulance_id
                "token_type": "bearer",
                "ambulance": {
                    "id": ambulance_id,
                    "name": registry_entry["name"],
                    "driver_name": registry_entry["driver_name"],
                    "status": registry_entry["status"],
                    "current_trip_id": registry_entry["current_trip_id"],
                    "lat": registry_entry["location"]["lat"],
                    "lng": registry_entry["location"]["lng"],
                    "last_updated": registry_entry["last_updated"]
                }
            }
        
        # Fallback to ambulances_db
        existing = ambulances_db.get(ambulance_id)
        if existing:
            return {
                "success": True,
                "ambulance_id": existing.id,
                "access_token": existing.id,  # Token IS the ambulance_id
                "token_type": "bearer",
                "ambulance": existing.dict()
            }
    
    # Create new ambulance and add to AMBULANCE_REGISTRY
    new_id = ambulance_id or f"AMB-{str(uuid.uuid4())[:8].upper()}"
    new_name = name or f"Ambulance {new_id[-4:]}"
    new_driver = driver_name or "Demo Driver"
    new_secret = secret or f"sec-{new_id.lower()}"
    
    # Add to AMBULANCE_REGISTRY
    AMBULANCE_REGISTRY[new_id] = {
        "ambulance_id": new_id,
        "secret": new_secret,
        "status": "available",
        "current_trip_id": None,
        "location": {"lat": 13.0827, "lng": 80.2707},
        "driver_name": new_driver,
        "name": new_name,
        "last_updated": now_iso(),
    }
    
    ambulance = Ambulance(id=new_id, name=new_name, driver_name=new_driver, status="available", last_updated=now_iso())
    ambulances_db[new_id] = ambulance
    
    # CRITICAL: access_token = ambulance_id
    return {"success": True, "ambulance_id": new_id, "access_token": new_id, "token_type": "bearer", "ambulance": ambulance.dict()}

@app.get("/amb/ambulance/me")
async def amb_ambulance_me(authorization: Optional[str] = Header(None)):
    """
    Get current ambulance details.
    CRITICAL: Uses AMBULANCE_REGISTRY and returns current_trip_id for Flutter sync.
    """
    ambulance_id = None
    
    if authorization:
        token = authorization.replace("Bearer ", "").replace("bearer ", "").strip()
        # Handle both legacy "demo-token-XXX" format and new direct ambulance_id format
        if token.startswith("demo-token-"):
            ambulance_id = token.replace("demo-token-", "")
        else:
            ambulance_id = token
    
    # Look up in AMBULANCE_REGISTRY first (authoritative source)
    if ambulance_id and ambulance_id in AMBULANCE_REGISTRY:
        registry_entry = AMBULANCE_REGISTRY[ambulance_id]
        return {
            "id": ambulance_id,
            "name": registry_entry["name"],
            "driver_name": registry_entry["driver_name"],
            "status": registry_entry["status"],
            "current_trip_id": registry_entry["current_trip_id"],  # CRITICAL for Flutter
            "plate_number": f"TN-{ambulance_id[-4:]}",
            "ambulance_type": "ALS",
            "lat": registry_entry["location"]["lat"],
            "lng": registry_entry["location"]["lng"],
            "last_updated": registry_entry["last_updated"]
        }
    
    # Fallback to ambulances_db
    if ambulance_id and ambulance_id in ambulances_db:
        amb = ambulances_db[ambulance_id]
        return {
            "id": amb.id,
            "name": amb.name,
            "driver_name": amb.driver_name,
            "status": amb.status,
            "current_trip_id": amb.current_trip_id,
            "plate_number": f"TN-{amb.id[-4:]}",
            "ambulance_type": "ALS",
            "lat": amb.lat,
            "lng": amb.lng,
            "last_updated": amb.last_updated
        }
    
    if ambulances_db:
        amb = list(ambulances_db.values())[0]
        return {
            "id": amb.id,
            "name": amb.name,
            "driver_name": amb.driver_name,
            "status": amb.status,
            "current_trip_id": amb.current_trip_id,
            "plate_number": f"TN-{amb.id[-4:]}",
            "ambulance_type": "ALS",
            "lat": amb.lat,
            "lng": amb.lng,
            "last_updated": amb.last_updated
        }
    
    return {"error": "No ambulance found", "id": None, "current_trip_id": None}
    
    return {"error": "No ambulance found"}

@app.post("/amb/gps/start")
async def amb_gps_start(route_name: str = "default_city_loop", step_seconds: float = 3.0, speed_kmh: float = 40.0):
    # Demo mode - just return success
    amb_id = list(ambulances_db.keys())[0] if ambulances_db else "AMB-DEMO"
    return {"status": "started", "ambulance_id": amb_id, "route_name": route_name}

@app.get("/amb/gps/current")
async def amb_gps_current():
    # Demo mode - return static position
    return {"lat": 13.0827, "lng": 80.2707, "speed_kmh": 40.0, "updated_at": now_iso(), "route_name": "demo_route", "route_index": 0, "is_running": True}

@app.post("/amb/signals/{ambulance_id}")
async def amb_signal_request_priority(ambulance_id: str, severity: str = "normal"):
    return {"state": "GREEN_FOR_AMBULANCE", "reason": "Priority granted", "distance_km": 0.5, "severity": severity}

@app.get("/amb/signals/{signal_id}/state")
async def amb_signal_state(signal_id: str):
    signal = signals_db.get(int(signal_id) if signal_id.isdigit() else 1)
    if signal:
        return {"state": signal.state, "history_count": 0, "green_time_remaining": 30}
    return {"state": "GREEN", "history_count": 0, "green_time_remaining": 30}

@app.post("/amb/corridor/update")
async def amb_corridor_update(severity: str = "normal"):
    amb_id = list(ambulances_db.keys())[0] if ambulances_db else "AMB-DEMO"
    return {"ambulance_id": amb_id, "hospital_id": None, "severity": severity, "corridor_signals": [str(s.id) for s in signals_db.values()], "type": "corridor"}

@app.get("/amb/corridor/{ambulance_id}")
async def amb_corridor_status(ambulance_id: str):
    return {"ambulance_id": ambulance_id, "hospital_id": None, "full_route": [], "active_corridor": [], "states": []}

@app.get("/amb/system/logs/{ambulance_id}")
async def amb_system_logs(ambulance_id: str):
    return {"ambulance_id": ambulance_id, "logs": []}

@app.get("/amb/system/conflicts/{signal_id}")
async def amb_system_conflicts(signal_id: str):
    return {"signal_id": signal_id, "conflict_history": []}

@app.get("/amb/traffic/latest")
async def amb_traffic_latest():
    return {"congestion_level": "low", "incident": None, "estimated_clearance_minutes": 0, "confidence": 0.95, "generated_at": now_iso()}

# =============================================================================
# MEDICO API ENDPOINTS (for medico-main frontend)
# =============================================================================

@app.get("/api/admin/hospitals")
async def api_admin_hospitals():
    return [h.dict() for h in hospitals_db.values()]

@app.post("/api/admin/hospitals")
async def api_admin_create_hospital(name: str = "New Hospital", city: str = "Metro City"):
    new_id = max(hospitals_db.keys()) + 1 if hospitals_db else 1
    hospital = Hospital(id=new_id, name=name, city=city, created_at=now_iso())
    hospitals_db[new_id] = hospital
    return hospital.dict()

@app.get("/api/admin/bed-summary")
async def api_admin_bed_summary():
    total_beds = sum(h.icu_total + h.hdu_total + h.general_total for h in hospitals_db.values())
    total_occupied = total_beds - sum(h.icu_available + h.hdu_available + h.general_available for h in hospitals_db.values())
    hospitals_summary = []
    for h in hospitals_db.values():
        h_total = h.icu_total + h.hdu_total + h.general_total
        h_available = h.icu_available + h.hdu_available + h.general_available
        hospitals_summary.append({
            "id": h.id, "hospital_id": h.id, "hospital_name": h.name, "city": h.city, "status": h.status,
            "total_beds": h_total, "total_occupied": h_total - h_available, "total_available": h_available,
            "overall_occupancy_rate": round((h_total - h_available) / h_total * 100, 1) if h_total > 0 else 0,
            "wards": [
                {"ward_type": "ICU", "total_capacity": h.icu_total, "total_occupied": h.icu_total - h.icu_available, "total_available": h.icu_available, "occupancy_rate": round((h.icu_total - h.icu_available) / h.icu_total * 100, 1) if h.icu_total > 0 else 0},
                {"ward_type": "HDU", "total_capacity": h.hdu_total, "total_occupied": h.hdu_total - h.hdu_available, "total_available": h.hdu_available, "occupancy_rate": round((h.hdu_total - h.hdu_available) / h.hdu_total * 100, 1) if h.hdu_total > 0 else 0},
                {"ward_type": "General", "total_capacity": h.general_total, "total_occupied": h.general_total - h.general_available, "total_available": h.general_available, "occupancy_rate": round((h.general_total - h.general_available) / h.general_total * 100, 1) if h.general_total > 0 else 0},
            ],
        })
    return {
        "total_hospitals": len(hospitals_db), "active_hospitals": len([h for h in hospitals_db.values() if h.status == "active"]),
        "total_beds": total_beds, "total_occupied": total_occupied, "total_available": total_beds - total_occupied,
        "overall_occupancy_rate": round(total_occupied / total_beds * 100, 1) if total_beds > 0 else 0,
        "by_ward_type": [
            {"ward_type": "ICU", "total_capacity": sum(h.icu_total for h in hospitals_db.values()), "total_occupied": sum(h.icu_total - h.icu_available for h in hospitals_db.values()), "total_available": sum(h.icu_available for h in hospitals_db.values()), "occupancy_rate": 75},
            {"ward_type": "HDU", "total_capacity": sum(h.hdu_total for h in hospitals_db.values()), "total_occupied": sum(h.hdu_total - h.hdu_available for h in hospitals_db.values()), "total_available": sum(h.hdu_available for h in hospitals_db.values()), "occupancy_rate": 72},
            {"ward_type": "General", "total_capacity": sum(h.general_total for h in hospitals_db.values()), "total_occupied": sum(h.general_total - h.general_available for h in hospitals_db.values()), "total_available": sum(h.general_available for h in hospitals_db.values()), "occupancy_rate": 68},
        ],
        "hospitals": hospitals_summary,
    }

@app.get("/api/admin/disease-trends")
async def api_admin_disease_trends(days: int = 30):
    return {
        "period_days": days, "total_emergencies": len(emergencies_db),
        "emergency_by_severity": [
            {"severity": "critical", "count": len([e for e in emergencies_db.values() if e.severity == "critical"]), "percentage": 15},
            {"severity": "high", "count": len([e for e in emergencies_db.values() if e.severity == "high"]), "percentage": 35},
            {"severity": "normal", "count": len([e for e in emergencies_db.values() if e.severity in ["normal", "medium", "low"]]), "percentage": 50},
        ],
        "total_admissions": len(patients_db),
        "admissions_by_ward": [
            {"ward_type": "ICU", "admission_count": 25, "active_patients": 15, "discharge_count": 10},
            {"ward_type": "HDU", "admission_count": 45, "active_patients": 30, "discharge_count": 15},
            {"ward_type": "General", "admission_count": 120, "active_patients": 80, "discharge_count": 40},
        ],
        "avg_daily_emergencies": 5.2, "avg_daily_admissions": 12.5, "trend_indicator": "stable",
    }

@app.get("/api/admin/outbreak-risk")
async def api_admin_outbreak_risk():
    return {
        "risk_level": "moderate", "confidence": 0.78,
        "factors": [
            {"factor": "ICU Occupancy Rate", "value": 75, "threshold": 80, "exceeds": False, "severity": "normal"},
            {"factor": "Respiratory Cases", "value": 45, "threshold": 50, "exceeds": False, "severity": "normal"},
            {"factor": "Emergency Surge", "value": 12, "threshold": 15, "exceeds": False, "severity": "normal"},
        ],
        "recommendations": ["Continue monitoring respiratory cases", "Maintain current bed availability", "Review emergency protocols"],
        "assessed_at": now_iso(),
    }

@app.post("/api/admin/notify")
async def api_admin_notify(title: str = "Notice", message: str = "System notice"):
    return {"notice_id": f"NOTICE-{uuid.uuid4().hex[:8]}", "title": title, "message": message, "severity": "info", "target_hospitals": list(hospitals_db.keys()), "sent_count": len(hospitals_db), "sent_at": now_iso()}

# =============================================================================
# HOSPITAL ADMIN API ENDPOINTS
# =============================================================================

@app.get("/api/hospital/wards")
async def api_hospital_wards(x_hospital_id: Optional[str] = Header(None, alias="X-Hospital-ID")):
    hospital_id = int(x_hospital_id) if x_hospital_id else 1
    hospital = hospitals_db.get(hospital_id, list(hospitals_db.values())[0])
    return {
        "hospital_id": hospital.id, "hospital_name": hospital.name,
        "updated_wards": [
            {"id": "icu-1", "ward_type": "ICU", "bed_group_id": 1, "previous_capacity": hospital.icu_total, "new_capacity": hospital.icu_total, "occupied": hospital.icu_total - hospital.icu_available, "available": hospital.icu_available, "occupancy_percentage": round((hospital.icu_total - hospital.icu_available) / hospital.icu_total * 100, 1) if hospital.icu_total > 0 else 0},
            {"id": "hdu-1", "ward_type": "HDU", "bed_group_id": 2, "previous_capacity": hospital.hdu_total, "new_capacity": hospital.hdu_total, "occupied": hospital.hdu_total - hospital.hdu_available, "available": hospital.hdu_available, "occupancy_percentage": round((hospital.hdu_total - hospital.hdu_available) / hospital.hdu_total * 100, 1) if hospital.hdu_total > 0 else 0},
            {"id": "general-1", "ward_type": "General", "bed_group_id": 3, "previous_capacity": hospital.general_total, "new_capacity": hospital.general_total, "occupied": hospital.general_total - hospital.general_available, "available": hospital.general_available, "occupancy_percentage": round((hospital.general_total - hospital.general_available) / hospital.general_total * 100, 1) if hospital.general_total > 0 else 0},
        ],
        "message": "Ward status retrieved", "updated_at": now_iso(),
    }

@app.patch("/api/hospital/wards")
async def api_hospital_update_wards(x_hospital_id: Optional[str] = Header(None, alias="X-Hospital-ID")):
    return await api_hospital_wards(x_hospital_id)

@app.get("/api/hospital/waste/prediction")
async def api_hospital_waste_prediction(x_hospital_id: Optional[str] = Header(None, alias="X-Hospital-ID")):
    hospital_id = int(x_hospital_id) if x_hospital_id else 1
    hospital = hospitals_db.get(hospital_id, list(hospitals_db.values())[0])
    occupied = (hospital.icu_total - hospital.icu_available) + (hospital.hdu_total - hospital.hdu_available) + (hospital.general_total - hospital.general_available)
    return {
        "hospital_id": hospital.id, "hospital_name": hospital.name, "current_waste_kg": round(occupied * 0.5, 1),
        "alert_level": "normal", "total_occupied_beds": occupied, "predicted_daily_kg": round(occupied * 0.5, 1), "predicted_weekly_kg": round(occupied * 0.5 * 7, 1),
        "by_ward": [
            {"ward_type": "ICU", "occupied_beds": hospital.icu_total - hospital.icu_available, "waste_rate_kg_per_day": 2.5, "predicted_daily_kg": round((hospital.icu_total - hospital.icu_available) * 2.5, 1)},
            {"ward_type": "HDU", "occupied_beds": hospital.hdu_total - hospital.hdu_available, "waste_rate_kg_per_day": 1.2, "predicted_daily_kg": round((hospital.hdu_total - hospital.hdu_available) * 1.2, 1)},
            {"ward_type": "General", "occupied_beds": hospital.general_total - hospital.general_available, "waste_rate_kg_per_day": 0.5, "predicted_daily_kg": round((hospital.general_total - hospital.general_available) * 0.5, 1)},
        ],
        "warning_threshold_kg": 500, "critical_threshold_kg": 800, "estimated_days_to_warning": 5, "estimated_days_to_critical": 10,
        "collection_recommended": False, "recommendation": "Waste levels are normal. Regular collection schedule applies.", "predicted_at": now_iso(),
    }

@app.get("/api/hospital/waste/comparison")
async def api_hospital_waste_comparison(days: int = 7):
    return {"hospital_id": 1, "hospital_name": "City General Hospital", "period_days": days, "actual_waste_kg": 520.5, "predicted_waste_kg": 540.0, "variance_kg": -19.5, "variance_percentage": -3.6, "assessment": "Good prediction accuracy. Actual waste was slightly below predicted."}

@app.post("/api/hospital/waste/request-pickup")
async def api_hospital_request_pickup(request: WastePickupRequest = None, x_hospital_id: Optional[str] = Header(None, alias="X-Hospital-ID")):
    hospital_id = int(x_hospital_id) if x_hospital_id else 1
    hospital = hospitals_db.get(hospital_id, list(hospitals_db.values())[0])
    request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
    return {"request_id": request_id, "hospital_id": hospital.id, "hospital_name": hospital.name, "current_waste_kg": 234.5, "urgency": request.urgency if request else "normal", "status": "requested", "requested_at": now_iso(), "message": "Pickup request submitted successfully"}

# =============================================================================
# MEDICAL STAFF API ENDPOINTS
# =============================================================================

@app.get("/api/medical/patients")
async def api_medical_patients(status: Optional[str] = None, ward: Optional[str] = None):
    patients = list(patients_db.values())
    if status:
        patients = [p for p in patients if p.status == status]
    if ward:
        patients = [p for p in patients if p.ward_type == ward]
    return {"items": [p.dict() for p in patients], "total": len(patients)}

@app.post("/api/medical/patient")
async def api_medical_admit_patient(request: PatientAdmitRequest):
    global patient_counter
    patient_counter += 1
    patient = Patient(id=patient_counter, hospital_id=1, name=request.name, age=request.age, gender=request.gender, ward_type=request.ward_type, status="admitted", diagnosis=request.diagnosis, severity=request.severity, admitted_at=now_iso())
    patients_db[patient.id] = patient
    return patient.dict()

@app.get("/api/medical/patient/{patient_id}")
async def api_medical_get_patient(patient_id: int):
    patient = patients_db.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
    return patient.dict()

@app.post("/api/medical/patient/{patient_id}/bed")
async def api_medical_assign_bed(patient_id: int):
    patient = patients_db.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
    patient.status = "assigned"
    return {"patient_id": patient_id, "hospital_id": patient.hospital_id, "bed_group_id": 1, "ward_type": patient.ward_type, "status": "assigned", "assigned_at": now_iso(), "message": "Bed assigned successfully"}

@app.post("/api/medical/patient/{patient_id}/discharge")
async def api_medical_discharge_patient(patient_id: int):
    patient = patients_db.get(patient_id)
    if not patient:
        return {"error": "Patient not found"}
    patient.status = "discharged"
    patient.discharged_at = now_iso()
    return {"patient_id": patient_id, "hospital_id": patient.hospital_id, "released_bed_group_id": 1, "released_ward_type": patient.ward_type, "discharged_at": patient.discharged_at, "message": "Patient discharged successfully"}

# =============================================================================
# WASTE TEAM API ENDPOINTS
# =============================================================================

@app.get("/api/waste/requests")
async def api_waste_requests(status: Optional[str] = None):
    requests = list(waste_requests_db.values())
    if status:
        requests = [r for r in requests if r.status == status]
    if not requests:
        sample_requests = [
            {"request_id": "REQ-001", "hospital_id": 1, "hospital_name": "City General Hospital", "reported_waste_kg": 456.2, "urgency": "normal", "status": "requested", "requested_at": now_iso(), "requested_by": "Hospital Admin"},
            {"request_id": "REQ-002", "hospital_id": 2, "hospital_name": "Metro Medical Center", "reported_waste_kg": 312.8, "urgency": "urgent", "status": "collected", "requested_at": now_iso(), "requested_by": "Hospital Admin"},
        ]
        return {"items": sample_requests, "total": len(sample_requests), "pending_count": 1, "collected_count": 1, "disposed_count": 0, "paid_count": 0}
    return {"items": [r.dict() for r in requests], "total": len(requests), "pending_count": len([r for r in requests if r.status == "requested"]), "collected_count": len([r for r in requests if r.status == "collected"]), "disposed_count": len([r for r in requests if r.status == "disposed"]), "paid_count": len([r for r in requests if r.status == "paid"])}

@app.post("/api/waste/collect")
async def api_waste_collect(request_id: str):
    return {"request_id": request_id, "status": "collected", "collected_kg": 450.0, "collected_by": "Waste Team", "collected_at": now_iso(), "message": "Waste collected successfully"}

@app.post("/api/waste/dispose")
async def api_waste_dispose(request_id: str):
    return {"request_id": request_id, "status": "disposed", "disposal_method": "incineration", "disposed_kg": 450.0, "disposed_by": "Waste Team", "disposal_facility": "Central Incineration Plant", "disposed_at": now_iso(), "message": "Waste disposed successfully"}

@app.post("/api/waste/payment")
async def api_waste_payment(request_id: str):
    return {"request_id": request_id, "status": "paid", "amount": 1250.00, "payment_reference": f"PAY-{uuid.uuid4().hex[:8].upper()}", "paid_at": now_iso(), "message": "Payment recorded successfully"}

# =============================================================================
# EMERGENCY API ENDPOINTS (for medico-main frontend)
# =============================================================================

@app.get("/api/emergencies")
async def api_emergencies(severity: Optional[str] = None, status: Optional[str] = None):
    return await emergency_list(status, severity)

@app.post("/api/emergencies")
async def api_create_emergency(request: EmergencyCreateRequest):
    return await emergency_create(request)

@app.get("/api/emergencies/{emergency_id}")
async def api_get_emergency(emergency_id: int):
    emergency = emergencies_db.get(emergency_id)
    if not emergency:
        return {"error": "Emergency not found"}
    return emergency.dict()

@app.get("/api/emergencies/candidates/{severity}")
async def api_emergency_candidates(severity: str):
    candidates = []
    for h in hospitals_db.values():
        if h.status != "active":
            continue
        candidates.append({
            "hospital_id": h.id, "hospital_name": h.name, "city": h.city, "status": h.status,
            "icu_available": h.icu_available, "icu_total": h.icu_total,
            "hdu_available": h.hdu_available, "hdu_total": h.hdu_total,
            "general_available": h.general_available, "general_total": h.general_total,
            "overall_occupancy_rate": round((1 - (h.icu_available + h.hdu_available + h.general_available) / (h.icu_total + h.hdu_total + h.general_total)) * 100, 1),
        })
    return candidates

@app.post("/api/control/emergencies/{emergency_id}/assign-hospital")
async def api_control_assign_emergency(emergency_id: int, request: EmergencyAssignRequest):
    return await emergency_assign(emergency_id, request)

@app.get("/api/control/hospital-loads")
async def api_control_hospital_loads():
    return await api_emergency_candidates("normal")

@app.get("/api/control/metrics")
async def api_control_metrics(days: int = 30):
    return {
        "total_emergencies": len(emergencies_db),
        "resolved_count": len([e for e in emergencies_db.values() if e.status == "resolved"]),
        "pending_count": len([e for e in emergencies_db.values() if e.status == "created"]),
        "avg_response_time_minutes": 8.5,
        "by_severity": [
            {"severity": "critical", "count": len([e for e in emergencies_db.values() if e.severity == "critical"]), "avg_response_minutes": 4.2},
            {"severity": "high", "count": len([e for e in emergencies_db.values() if e.severity == "high"]), "avg_response_minutes": 7.1},
            {"severity": "normal", "count": len([e for e in emergencies_db.values() if e.severity in ["normal", "medium", "low"]]), "avg_response_minutes": 12.5},
        ],
    }

# =============================================================================
# NOTIFICATIONS ENDPOINT
# =============================================================================

@app.get("/api/notifications")
async def api_notifications():
    return {
        "items": [
            {"id": "1", "title": "High Occupancy Alert", "message": "ICU occupancy at City General Hospital has reached 85%", "severity": "warning", "recipient_role": "hospital_admin", "recipient_hospital_id": 1, "read_at": None, "created_at": now_iso(), "action_url": "/hospital-admin/beds"},
            {"id": "2", "title": "New Emergency Case", "message": "Critical emergency case requires immediate attention", "severity": "critical", "recipient_role": "emergency_service", "recipient_hospital_id": None, "read_at": None, "created_at": now_iso(), "action_url": "/emergency"},
            {"id": "3", "title": "Waste Pickup Scheduled", "message": "Waste pickup scheduled for tomorrow", "severity": "info", "recipient_role": "hospital_admin", "recipient_hospital_id": 1, "read_at": now_iso(), "created_at": now_iso(), "action_url": None},
        ],
        "total": 3, "unread_count": 2,
    }

# =============================================================================
# HEALTH CHECK
# =============================================================================

@app.get("/")
async def root():
    return {"status": "healthy", "service": "MEDICO Demo Backend", "version": "1.0.0", "demo_mode": True, "timestamp": now_iso()}

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": now_iso()}

# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
async def startup_event():
    print("=" * 60)
    print("MEDICO Demo Backend Started")
    print("=" * 60)
    print(f"Hospitals: {len(hospitals_db)}")
    print(f"Ambulances: {len(ambulances_db)}")
    print(f"Signals: {len(signals_db)}")
    print(f"Trips: {len(trips_db)}")
    print(f"Emergencies: {len(emergencies_db)}")
    print(f"Patients: {len(patients_db)}")
    print("=" * 60)
    print("Ready for demo!")
    print("=" * 60)
