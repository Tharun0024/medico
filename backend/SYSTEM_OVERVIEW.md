# MEDICO Backend - Complete System Overview

## What MEDICO Can Do

MEDICO is an **AI-driven Hospital Coordination and Emergency Orchestration System** that manages:

1. **Emergency Management** - Create, assign, and resolve emergency cases with severity-based hospital matching
2. **Bed/Ward Management** - Track ICU, HDU, and General ward capacity across hospitals
3. **Patient Lifecycle** - Admit, assign beds, transfer, discharge patients
4. **Waste Management** - Track medical waste levels, predict generation, manage collection/disposal
5. **Notifications** - Real-time alerts across roles via WebSocket
6. **District Governance** - Disease trends, outbreak risk detection, hospital oversight

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FastAPI Application                          │
├─────────────────────────────────────────────────────────────────────┤
│  API Layer (/api/*)           │  Core Services                      │
│  ├── hospitals                │  ├── RBAC (role-based access)       │
│  ├── beds                     │  ├── Event Bus (pub/sub)            │
│  ├── emergencies              │  ├── WebSocket (real-time)          │
│  ├── notifications            │  └── Config (settings)              │
│  ├── control_room (Phase-2)   │                                     │
│  ├── hospital_admin (Phase-2) ├──────────────────────────────────────┤
│  ├── medical_staff (Phase-2)  │  Database Layer                     │
│  ├── waste_team (Phase-2)     │  ├── SQLAlchemy 2.0 (async)         │
│  └── super_admin (Phase-2)    │  ├── SQLite (aiosqlite)             │
│                               │  └── Models (Hospital, Bed, etc.)   │
├───────────────────────────────┴──────────────────────────────────────┤
│  Simulation Layer (/simulation/*)                                    │
│  ├── Hospital Activity Simulator                                     │
│  ├── Emergency Generator/Resolver                                    │
│  └── Waste Level Simulator                                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Role-Based Dashboard Separation (6 Roles)

| Role | Scope | Dashboard Prefix | What They See/Do |
|------|-------|------------------|------------------|
| **SUPER_ADMIN** | District-wide | `/api/admin/*` | All hospitals, bed summary, disease trends, outbreak risk, send notices |
| **HOSPITAL_ADMIN** | Single Hospital | `/api/hospital/*` | Their hospital's wards, waste prediction, pickup requests |
| **MEDICAL_STAFF** | Single Hospital | `/api/medical/*` | Ward status, patient management, waste reporting |
| **WASTE_TEAM** | District-wide | `/api/waste/*` | All hospitals' waste, collection/disposal workflow |
| **EMERGENCY_SERVICE** | District-wide | `/api/emergency/*` | ICU availability, hospital suggestions |
| **CONTROL_ROOM** | District-wide | `/api/control/*` | Manual assignment, reassignment, response metrics |

### RBAC Implementation

**File:** `app/core/rbac.py`

```
Headers Required:
  X-Role: super_admin | hospital_admin | medical_staff | waste_team | emergency_service | control_room
  X-Hospital-ID: <number>  (required for hospital-scoped roles)
```

---

## Key File Responsibilities

### Core Infrastructure

| File | Purpose |
|------|---------|
| `app/main.py` | FastAPI app, router registration, lifespan events, CORS |
| `app/core/rbac.py` | Role enum, `RequestContext`, `require_role()` dependency |
| `app/core/event_bus.py` | In-memory pub/sub with 30+ event types, async handlers |
| `app/core/websocket.py` | Real-time broadcasting to connected clients |
| `app/database/session.py` | Async SQLAlchemy session factory |
| `app/database/init_db.py` | Database initialization, model imports |

### Domain Models

**Location:** `app/modules/`

| Model | Fields |
|-------|--------|
| **Hospital** | id, name, city, status (active/inactive/maintenance) |
| **BedGroup** | hospital_id, ward_type (ICU/HDU/GENERAL), total_capacity, occupied |
| **EmergencyCase** | severity, status (created→assigned→resolved), hospital_id, bed_group_id |
| **Patient** | hospital_id, bed_group_id, status (admitted→assigned→in_treatment→discharged) |
| **WasteRequest** | status (requested→collected→disposed→paid), collected_kg, disposed_kg |
| **DisposalLog** | Immutable audit trail for waste disposal |
| **Notification** | recipient_role, recipient_scope, severity, read_at |

---

## Phase-2 Enhancements (What Was Added)

### 1. Control Room APIs

**Location:** `app/api/control_room/`

- **Manual Assignment**: Override auto-assignment for emergencies
- **Reassignment**: Move emergency to different hospital (releases old bed)
- **Metrics**: Response times, resolution rates by severity
- **Hospital Loads**: Real-time ICU/HDU/General availability

### 2. Hospital Admin APIs

**Location:** `app/api/hospital_admin/`

- **Get Ward Status**: GET read-only ward capacity and occupancy
- **Update Ward Capacity**: PATCH ward capacities
- **Waste Prediction**: ML-lite prediction based on patient count + ward type
- **Pickup Requests**: Request waste collection from waste team

### 3. Medical Staff APIs

**Location:** `app/api/medical_staff/`

- **Patient Admit**: Create new patient record
- **Bed Assignment**: Assign patient to ward/bed
- **Transfer**: Move patient between wards
- **Discharge**: Release patient and free bed
- **Treatment Update**: Update treatment type (affects waste prediction)
- **Waste Report**: Log waste generation by ward
- **Waste Predict Trigger**: Manually trigger prediction update

### 4. Waste Team APIs

**Location:** `app/api/waste_team/`

- **View Requests**: See all pickup requests with status filter
- **Collect**: Mark waste as collected (records actual kg)
- **Dispose**: Mark as disposed (20% tolerance validation)
- **Payment**: Record payment completion
- **Logs**: Immutable disposal audit trail

### 5. Super Admin APIs

**Location:** `app/api/super_admin/`

- **Add Hospital**: Create new hospital with initial capacities
- **Edit Hospital**: Update status, name, city
- **Bed Summary**: District-wide availability by ward type
- **Disease Trends**: Emergency severity + admission patterns
- **Outbreak Risk**: Rule-based risk assessment (LOW/MODERATE/HIGH)
- **Send Notices**: Broadcast to hospital admins

---

## Workflow Examples

### Emergency Workflow

```
1. Emergency Created (severity: CRITICAL/HIGH/NORMAL)
   └─> Event: emergency.created
   
2. Auto-Assignment OR Manual Assignment
   ├─> Find hospitals with matching ward availability
   ├─> Reserve bed (occupancy += 1)
   ├─> Event: emergency.assigned
   └─> Notification to HOSPITAL_ADMIN

3. Resolution
   ├─> Release bed (occupancy -= 1)
   ├─> Event: emergency.resolved
   └─> Patient optionally admitted
```

### Patient Workflow

```
1. Admit Patient
   └─> Event: patient.admitted
   
2. Assign Bed
   ├─> Validate ward capacity
   ├─> Increment occupancy
   └─> Event: patient.bed.assigned

3. Transfer (optional)
   ├─> Release old bed
   ├─> Reserve new bed
   └─> Event: patient.transferred

4. Discharge
   ├─> Release bed
   ├─> Update waste prediction
   └─> Event: patient.discharged
```

### Waste Collection Workflow (State Machine)

```
REQUESTED ──────> COLLECTED ──────> DISPOSED ──────> PAID
     │                │                  │              │
     │                │                  │              └─ Event: waste.payment.completed
     │                │                  └─ Tolerance check (disposed ≤ collected × 1.20)
     │                │                     Event: waste.disposed
     │                │                     Notification to HOSPITAL_ADMIN
     │                └─ Record actual kg
     │                   Event: waste.collected
     └─ Hospital Admin creates request
        Event: waste.pickup.requested
```

---

## Event Types (30+)

```python
# Emergency
emergency.created
emergency.assigned
emergency.resolved
emergency.failed
emergency.manually_assigned
emergency.reassigned

# Bed
bed.reserved
bed.released
bed.occupancy.updated

# Hospital
hospital.registered
hospital.updated
hospital.notified.incoming_emergency
hospital.capacity.updated

# Patient (Phase-2)
patient.admitted
patient.bed.assigned
patient.transferred
patient.discharged
patient.treatment.updated

# Waste
waste.generated
waste.threshold.warning
waste.threshold.critical
waste.collected
waste.pickup.requested
waste.reported
waste.prediction.updated
waste.disposed
waste.payment.completed

# Governance (Phase-2)
admin.notice.sent
outbreak.risk.detected

# Notification
notification.created
notification.read
```

---

## API Endpoint Summary (62 Routes)

| Module | Endpoints |
|--------|-----------|
| Hospitals | `POST/GET /api/hospitals` |
| Beds | `POST /api/beds`, `GET/PATCH /api/beds/{id}` |
| Emergencies | `POST/GET`, `/assign`, `/resolve`, `/candidates` |
| Admin Dashboard | `GET /overview`, `/hospitals/performance` |
| Hospital Dashboard | `GET /dashboard`, `/dashboard/{id}` |
| Waste Dashboard | `GET /dashboard`, `/tasks`, `POST /complete` |
| Emergency Dashboard | `GET /dashboard`, `/bed-availability`, `/suggest-hospital` |
| Medical Dashboard | `GET /dashboard`, `/wards` |
| **Control Room** | `POST /assign-hospital`, `/reassign`, `GET /metrics`, `/hospital-loads` |
| **Hospital Admin** | `GET/PATCH /wards`, `GET /waste/prediction`, `POST /waste/request-pickup` |
| **Medical Staff** | `POST/GET /patient`, `/bed`, `/transfer`, `/discharge`, `/treatment`, `/waste` |
| **Waste Team** | `GET /requests`, `/logs`, `POST /collect`, `/dispose`, `/payment` |
| **Super Admin** | `POST/PATCH /hospitals`, `GET /bed-summary`, `/disease-trends`, `/outbreak-risk`, `POST /notify` |
| Notifications | `GET /notifications`, `POST /{id}/read` |
| Simulation | `GET /status`, `POST /start`, `/stop` |
| System | `GET /health`, `/`, WebSocket `/ws` |

---

## Directory Structure

```
backend/
├── main.py                       # Unified entrypoint (MEDICO + AMB)
├── app/                          # MEDICO system
│   ├── api/                      # REST endpoints
│   │   ├── hospitals.py
│   │   ├── beds.py
│   │   ├── emergencies.py
│   │   ├── control_room/         # Phase-2
│   │   ├── hospital_admin/       # Phase-2
│   │   ├── medical_staff/        # Phase-2
│   │   ├── waste_team/           # Phase-2
│   │   └── super_admin/          # Phase-2
│   ├── core/                     # RBAC, EventBus, WebSocket
│   ├── database/                 # SQLAlchemy async
│   ├── modules/                  # Domain models
│   ├── notifications/            # Notification system
│   ├── simulation/               # Bed/Emergency/Waste simulators
│   └── main.py                   # MEDICO-only entrypoint
├── amb/                          # AMB system (isolated)
│   ├── api/                      # REST endpoints
│   │   ├── trips.py
│   │   ├── gps.py
│   │   ├── signal.py
│   │   ├── corridor.py
│   │   └── dashboard.py
│   ├── core/                     # Config, Auth, Lifecycle
│   ├── services/                 # GPS, Signal, Route services
│   ├── routes/                   # Ambulance registration
│   └── main.py                   # AMB-only entrypoint
├── integrations/                 # MEDICO ↔ AMB bridge (future)
│   ├── README.md                 # Integration contract
│   └── __init__.py
└── requirements.txt
```

---

## Running the Server

```bash
# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start unified server (MEDICO + AMB)
uvicorn main:app --host 127.0.0.1 --port 8000

# With auto-reload (development)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Start MEDICO only (legacy)
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

## API Documentation

- **Swagger UI**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc
- **OpenAPI JSON**: http://127.0.0.1:8000/openapi.json

## Routing Prefixes

| System | Prefix | Description |
|--------|--------|-------------|
| MEDICO | `/api/*` | Hospital coordination, emergencies, beds, waste |
| AMB | `/amb/*` | Ambulance routing, GPS, traffic signals |
| System | `/health`, `/ws` | Health check, WebSocket |

---

## Technology Stack

- **Framework**: FastAPI (async Python)
- **ORM**: SQLAlchemy 2.0 (async)
- **Database**: SQLite (aiosqlite)
- **Validation**: Pydantic v2
- **Real-time**: WebSocket
- **Python**: 3.10+
