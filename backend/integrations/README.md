# MEDICO ↔ AMB Integration Contract

This directory defines the integration boundary between the MEDICO and AMB systems.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      Unified FastAPI Server                              │
├─────────────────────────────┬───────────────────────────────────────────┤
│       MEDICO (/api/*)       │              AMB (/amb/*)                 │
│  (System of Record)         │         (Executor/Actuator)               │
├─────────────────────────────┼───────────────────────────────────────────┤
│  - Hospitals                │  - Ambulance registry                     │
│  - Beds / Wards             │  - GPS simulation                         │
│  - Emergencies              │  - Routing & ETA                          │
│  - Patients                 │  - Traffic signal FSM                     │
│  - Waste lifecycle          │  - Green corridor logic                   │
│  - Notifications            │  - Trip lifecycle                         │
│  - Control Room decisions   │                                           │
└─────────────────────────────┴───────────────────────────────────────────┘
                                    │
                            ┌───────┴───────┐
                            │ integrations/ │
                            │ (API Bridge)  │
                            └───────────────┘
```

---

## Integration Rules

### MEDICO is the System of Record

MEDICO owns all medical logic:
- Hospital selection for emergencies
- Bed availability and assignment
- Patient admissions and discharges
- Medical state transitions

### AMB is an Executor

AMB executes routing and transport:
- Receives hospital assignments FROM MEDICO
- Provides routing and ETA calculations
- Controls traffic signal priority
- Tracks ambulance movement

### Forbidden Cross-Imports

```
❌ amb/ must NEVER import from app/
❌ app/ must NEVER import from amb/
✅ integrations/ is the ONLY allowed bridge
```

---

## AMB → MEDICO API Calls (Future Implementation)

AMB will call these MEDICO endpoints to execute emergency workflows:

### 1. Create Emergency

```
POST /api/emergencies
```

AMB creates an emergency when a patient pickup is initiated.
MEDICO assigns the hospital based on severity and bed availability.

**Request:**
```json
{
  "severity": "critical",
  "location": "Chennai Central",
  "caller_phone": "+91-9876543210",
  "description": "Cardiac emergency"
}
```

**Response:**
```json
{
  "id": 42,
  "status": "created",
  "severity": "critical",
  "assigned_hospital_id": null
}
```

### 2. Get Hospital Assignment

```
POST /api/control/assign-hospital
```

AMB requests hospital assignment for an emergency.
MEDICO selects the best hospital based on:
- Bed availability
- Ward type match
- Hospital status

**Request:**
```json
{
  "emergency_id": 42
}
```

**Response:**
```json
{
  "emergency_id": 42,
  "hospital_id": 1,
  "hospital_name": "City General Hospital",
  "bed_group_id": 3,
  "ward_type": "icu"
}
```

### 3. Resolve Emergency

```
POST /api/emergencies/{id}/resolve
```

AMB calls when the patient is delivered to the hospital.
MEDICO finalizes the emergency and releases resources.

**Request:**
```json
{
  "emergency_id": 42,
  "resolution_notes": "Patient delivered successfully"
}
```

---

## MEDICO → AMB Events (Future Implementation)

MEDICO will emit these events for AMB to consume:

### 1. emergency.assigned

Emitted when MEDICO assigns a hospital to an emergency.

```json
{
  "event_type": "emergency.assigned",
  "data": {
    "emergency_id": 42,
    "hospital_id": 1,
    "hospital_name": "City General Hospital",
    "hospital_location": {"lat": 13.0827, "lng": 80.2707},
    "severity": "critical"
  }
}
```

**AMB Action:** Start routing to the assigned hospital.

### 2. emergency.reassigned

Emitted when Control Room reassigns an emergency to a different hospital.

```json
{
  "event_type": "emergency.reassigned",
  "data": {
    "emergency_id": 42,
    "previous_hospital_id": 1,
    "new_hospital_id": 2,
    "new_hospital_name": "Metro Medical Center",
    "reason": "ICU full at original hospital"
  }
}
```

**AMB Action:** Recalculate route to new hospital.

### 3. hospital.notified.incoming_emergency

Emitted when MEDICO notifies a hospital of an incoming emergency.

```json
{
  "event_type": "hospital.notified.incoming_emergency",
  "data": {
    "hospital_id": 1,
    "emergency_id": 42,
    "severity": "critical",
    "eta_minutes": 8
  }
}
```

---

## Data Ownership

| Data | Owner | AMB Access |
|------|-------|------------|
| Hospitals | MEDICO | Read-only via API |
| Beds | MEDICO | None |
| Emergencies | MEDICO | Create/Resolve via API |
| Patients | MEDICO | None |
| Ambulances | AMB | Full control |
| Routes | AMB | Full control |
| Traffic Signals | AMB | Full control |
| GPS Positions | AMB | Full control |

---

## Hospital Data Alignment

**CRITICAL:** MEDICO and AMB must reference the **SAME** hospital data.

### Single Source of Truth

The file `backend/data/hospitals.json` is the **canonical source** for hospital data:

```json
{
  "hospitals": [
    {
      "id": "HOSP-001",          // AMB string ID
      "medico_id": 1,            // MEDICO integer ID (EXPLICIT, not auto-increment)
      "name": "Apollo Hospital Greams Road",
      "city": "Chennai",
      "lat": 13.0547,
      "lng": 80.2526,
      "priority_level": "tertiary",
      "active": true
    }
  ]
}
```

### ID Mapping

| AMB ID | MEDICO ID | Description |
|--------|-----------|-------------|
| `HOSP-001` | `1` | String ID for routing |
| `HOSP-002` | `2` | Integer ID for database |

**CRITICAL CHANGE:** MEDICO hospital IDs are now **EXPLICIT** (not auto-increment).
The `medico_id` from `hospitals.json` is directly assigned as `Hospital.id` in the database.

The mapping is defined in `hospitals.json` and used by:
- `app/database/seed_hospitals.py` - Seeds MEDICO DB with explicit IDs
- `amb/data/hospital_loader.py` - Loads and maps IDs for AMB
- `amb/api/trips.py` - Uses `amb_id_to_medico_id()` for MEDICO calls

### Automatic Seeding on Startup

On server startup, `main.py` performs these operations:

1. **Seeds missing hospitals** from `backend/data/hospitals.json`
   - Uses explicit ID assignment (`Hospital.id = medico_id`)
   - Creates default bed groups (ICU: 20, HDU: 40, General: 100)
   - Skips hospitals that already exist

2. **Validates ALL hospitals** against the JSON:
   - Count must match exactly
   - All `medico_id` values must exist in DB
   - Names must match
   - AMB IDs (`amb_id` column) must match
   - Coordinates must match (within 0.001 degrees)

3. **FAILS LOUDLY** if any mismatch is detected:
   - Server will NOT start with misaligned data
   - Clear error logs explain the mismatch
   - Manual intervention required to fix

### Manual Seeding (Optional)

If you need to seed hospitals manually:

```bash
# From backend directory
python -m app.database.seed_hospitals
```

This will:
1. Initialize the database tables
2. Seed all hospitals from `hospitals.json`
3. Validate the result

**DO NOT use the Super Admin API to create hospitals manually.**
Manual creation is disabled to prevent ID misalignment.

### Validation Errors

If validation fails, you'll see errors like:

```
FATAL: Hospital data mismatch detected!
Hospital 5 (HOSP-005): name mismatch - expected 'Kauvery Hospital Alwarpet', got 'Wrong Name'
Hospital 10 (HOSP-010): existence mismatch - expected 'exists', got 'missing'
```

**To fix:**
1. If DB has wrong data: Reset the database and restart
2. If JSON is wrong: Fix `backend/data/hospitals.json` and restart
3. Never modify hospital data in production without coordination

---

## Simulation Boundaries

| Simulation | Owner |
|------------|-------|
| Bed occupancy | MEDICO |
| Emergency generation | MEDICO |
| Waste levels | MEDICO |
| Ambulance movement | AMB |
| GPS coordinates | AMB |
| Traffic signals | AMB |
| Green corridors | AMB |

---

## Implementation Status

| Integration | Status |
|-------------|--------|
| Folder isolation | ✅ Complete |
| Unified entrypoint | ✅ Complete |
| Shared hospital data | ✅ Complete |
| Explicit hospital IDs | ✅ Complete |
| Hospital ID mapping | ✅ Complete |
| Automatic seeding | ✅ Complete |
| Startup validation (FATAL) | ✅ Complete |
| AMB → MEDICO API client | ✅ Complete |
| E2E verification tests | ✅ Complete |
| MEDICO → AMB events | ⏳ Planned |
| Event bridge | ⏳ Planned |

---

## E2E Backend Verification

Run the verification suite to confirm all integrations work:

```bash
# From backend directory, with server running
python -m tests.test_e2e_verification
```

This verifies:
1. **Hospital Registry** - DB ↔ JSON alignment
2. **Emergency Flow** - Create → Assign → Resolve
3. **AMB Integration** - Trip → MEDICO coordination
4. **Simulation Safety** - MEDICO-only mutations

---

## Implemented Integration Components

### AMB → MEDICO HTTP Client

**Location:** `backend/amb/integrations/medico_client.py`

Provides async HTTP client for AMB to call MEDICO APIs:

```python
from amb.integrations.medico_client import get_medico_client

async with get_medico_client() as client:
    # Create emergency
    emergency = await client.create_emergency(payload)
    
    # Assign hospital (manual selection)
    assignment = await client.assign_hospital(
        emergency_id=42,
        hospital_id=1,
        bed_group_id=3,
        reason="Dispatcher selection"
    )
    
    # Resolve emergency
    await client.resolve_emergency(emergency_id=42)
    
    # Fetch all hospitals
    hospitals = await client.get_hospitals()
```

### Hospital Loader

**Location:** `backend/amb/data/hospital_loader.py`

Loads hospitals from shared data and provides ID mapping:

```python
from amb.data.hospital_loader import (
    get_hospitals_as_db,
    get_hospital_by_id,
    amb_id_to_medico_id,
    medico_id_to_amb_id,
)

# Get hospital database for routing
hospitals = get_hospitals_as_db()

# Convert IDs
medico_id = amb_id_to_medico_id("HOSP-001")  # Returns 1
amb_id = medico_id_to_amb_id(1)              # Returns "HOSP-001"
```

---

## Next Steps

1. ✅ **Phase 1:** AMB → MEDICO API client in `amb/integrations/medico_client.py`
2. ⏳ **Phase 2:** MEDICO → AMB event handlers in `integrations/amb_event_handlers.py`
3. ⏳ **Phase 3:** End-to-end workflow testing

---

## File Structure

```
backend/
├── data/
│   └── hospitals.json         # Shared hospital data (source of truth)
├── integrations/
│   └── README.md              # This file
├── amb/
│   ├── data/
│   │   └── hospital_loader.py # Loads shared hospital data for AMB
│   └── integrations/
│       └── medico_client.py   # AMB calls MEDICO APIs
└── app/
    └── api/
        └── hospitals.py       # MEDICO hospital endpoints
```
