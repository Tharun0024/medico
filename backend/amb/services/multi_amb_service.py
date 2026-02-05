from typing import List, Dict
from amb.services.corridor_service import get_corridor_ahead
from amb.services.conflict_resolver import resolve_conflict, RESOURCE_LOCKS
from amb.services.gps_simulator import GPS_STORE
from amb.core.startup import AMBULANCE_REGISTRY

def get_authorized_corridor(ambulance_id: str, severity: str) -> List[str]:
    corridor_candidates = get_corridor_ahead(ambulance_id, severity)  # Phase 5 unchanged
    authorized = []
    
    # Build severity map for all active ambulances (use passed severity for requesting ambulance)
    severity_map: Dict[str, str] = {}
    for amb_id in GPS_STORE.keys():
        if amb_id == ambulance_id:
            severity_map[amb_id] = severity
        else:
            # Default to MODERATE for other ambulances (real system would track per-ambulance severity)
            severity_map[amb_id] = "MODERATE"
    
    for sig_id in corridor_candidates:
        # Get all ambulances competing for this signal
        competing_ambulances = list(GPS_STORE.keys())
        winner = resolve_conflict(sig_id, competing_ambulances, severity_map)  
        if winner == ambulance_id:
            authorized.append(sig_id)
    return authorized
