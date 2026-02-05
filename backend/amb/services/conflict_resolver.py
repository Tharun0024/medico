from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from amb.services.gps_simulator import GPS_STORE
from amb.services.route_service import ROUTES, SIGNAL_POSITIONS
from enum import Enum
import time

class SeverityPriority(Enum):
    LOW = 1
    MODERATE = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class PriorityScore:
    ambulance_id: str
    severity_score: int
    eta_seconds: float  # Pseudo-ETA = dist / speed
    dist_km: float
    arrival_time: float  # GPS timestamp
    reason: str

RESOURCE_LOCKS: Dict[str, Optional[str]] = {}  # sig_id/corridor_id -> winning_amb_id or None
DECISION_LOG: List[Dict] = []  # Global decisions

SEVERITY_MAP = {"LOW": SeverityPriority.LOW, "MODERATE": SeverityPriority.MODERATE, 
                "HIGH": SeverityPriority.HIGH, "CRITICAL": SeverityPriority.CRITICAL}

def resolve_conflict(resource_id: str, candidates: List[str], severity_map: Dict[str, str]) -> Optional[str]:
    """Deterministic priority: severity > ETA > dist > arrival"""
    scores: List[PriorityScore] = []
    for amb_id in candidates:
        if amb_id not in GPS_STORE:
            continue
        gps = GPS_STORE[amb_id]
        sev = severity_map.get(amb_id, "LOW")
        sev_score = SEVERITY_MAP[sev].value
        
        # Pseudo-ETA: dist to resource / speed (m/s * 3.6 for km/h approx)
        dist = ((gps.lat - SIGNAL_POSITIONS[resource_id][0])**2 + (gps.lng - SIGNAL_POSITIONS[resource_id][1])**2)**0.5 * 111
        eta = dist / (gps.speed_kmh / 3.6) if gps.speed_kmh > 0 else 999
        
        score = PriorityScore(amb_id, sev_score, eta, dist, gps.updated_at.timestamp(), 
                              f"sev:{sev_score}/eta:{eta:.1f}s/dist:{dist:.2f}km")
        scores.append(score)
    
    if not scores:
        RESOURCE_LOCKS[resource_id] = None
        return None
    
    # Priority: higher severity > lower ETA > lower distance > later arrival time
    winner = max(scores, key=lambda s: (s.severity_score, -s.eta_seconds, -s.dist_km, s.arrival_time))
    RESOURCE_LOCKS[resource_id] = winner.ambulance_id
    log = {"timestamp": time.time(), "resource": resource_id, "winner": winner.ambulance_id, 
           "reason": winner.reason, "losers": [s.ambulance_id for s in scores if s.ambulance_id != winner.ambulance_id]}
    DECISION_LOG.append(log)
    if len(DECISION_LOG) > 1000:
        DECISION_LOG.pop(0)
    return winner.ambulance_id
