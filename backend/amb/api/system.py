from fastapi import APIRouter, Depends, HTTPException
from amb.core.auth import get_current_ambulance
from amb.services.gps_simulator import GPS_STORE
from amb.services.conflict_resolver import RESOURCE_LOCKS, DECISION_LOG
from amb.services.multi_amb_service import get_authorized_corridor

router = APIRouter(prefix="/system", tags=["system"])

@router.get("/status")
async def system_status(current_amb=Depends(get_current_ambulance)):
    return {
        "active_ambulances": list(GPS_STORE.keys()),
        "locked_resources": RESOURCE_LOCKS,
        "suppressed_ambulances": [amb for amb in GPS_STORE if not get_authorized_corridor(amb, "HIGH")],
        "log_preview": DECISION_LOG[-10:]
    }

@router.get("/logs/{ambulance_id}")
async def amb_logs(ambulance_id: str, current_amb=Depends(get_current_ambulance)):
    if current_amb["ambulance_id"] != ambulance_id:
        raise HTTPException(403)
    amb_logs = [log for log in DECISION_LOG if log['winner'] == ambulance_id or ambulance_id in log.get('losers', [])]
    return {"ambulance_id": ambulance_id, "logs": amb_logs[-50:]}

@router.get("/conflicts/{signal_id}")
async def signal_conflicts(signal_id: str):
    logs = [log for log in DECISION_LOG if log['resource'] == signal_id]
    return {"signal_id": signal_id, "conflict_history": logs[-20:]}
