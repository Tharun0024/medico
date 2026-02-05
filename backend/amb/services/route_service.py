import json
from pathlib import Path
from typing import List, Dict, Any
from amb.services.gps_simulator import GPS_STORE
from amb.core.startup import AMBULANCE_REGISTRY  # Phase 1 static
from amb.core.config import settings

# In-memory from startup load
ROUTES: Dict[str, List[str]] = {}  # hospital_id -> [sig_ids ordered]
SIGNAL_POSITIONS: Dict[str, tuple[float, float]] = {}  # From Phase 4

def load_routes():
    routes_path = settings.DATA_DIR / "routes.json"
    with routes_path.open("r", encoding="utf-8") as f:
        routes_data = json.load(f)
    
    ROUTES.clear()
    for hospital_id, route_info in routes_data.items():
        ROUTES[hospital_id] = route_info["signal_sequence"]

def get_route_ahead_signals(ambulance_id: str, max_ahead: int = 3) -> List[str]:
    if ambulance_id not in GPS_STORE:
        return []
    gps = GPS_STORE[ambulance_id]
    amb_data = AMBULANCE_REGISTRY.get(ambulance_id, {})
    hospital_id = amb_data.get('hospital_id')
    
    if hospital_id not in ROUTES:
        return []
    
    route = ROUTES[hospital_id]
    # Find current position index (nearest signal ahead on route)
    distances = []
    for i, sig_id in enumerate(route):
        if sig_id not in SIGNAL_POSITIONS:
            continue
        lat, lng = SIGNAL_POSITIONS[sig_id]
        dist = ((gps.lat - lat)**2 + (gps.lng - lng)**2)**0.5 * 111
        distances.append((i, sig_id, dist))
    
    if not distances:
        return []
    
    # Find closest signal that is ahead: if ambulance passed closest, use next
    distances.sort(key=lambda x: x[2])
    current_idx = distances[0][0]
    
    # If distance to closest is very small (<300m), assume passed it, start from next
    if distances[0][2] < 0.3:  # 300 meters - ambulance likely passed this signal
        current_idx += 1
    
    # Take next N ahead on route (no wrap, exclude passed signals)
    ahead_signals = route[current_idx : current_idx + max_ahead]
    
    return ahead_signals[:max_ahead]  # Cap explicit
