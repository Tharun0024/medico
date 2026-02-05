import json
from pathlib import Path
from typing import List, Dict
from amb.core.signal_fsm import TrafficSignalFSM, SignalState
from amb.services.gps_simulator import GPS_STORE
from amb.services.signal_service import SIGNAL_STORE, get_or_init_signal
from amb.services.route_service import get_route_ahead_signals, load_routes, SIGNAL_POSITIONS
from amb.core.config import settings

MAX_CORRIDOR_SIGNALS = 3

def load_signals():
    signals_path = settings.DATA_DIR / "signals.json"
    with signals_path.open("r", encoding="utf-8") as f:
        signals_data = json.load(f)
    
    SIGNAL_POSITIONS.clear()
    for signal in signals_data:
        # signals.json has "location": [lat, lng] not separate lat/lng fields
        SIGNAL_POSITIONS[signal["signal_id"]] = tuple(signal["location"])
    
    load_routes()  # Phase 5 chain load

def get_corridor_ahead(ambulance_id: str, severity: str, max_signals: int = MAX_CORRIDOR_SIGNALS) -> List[str]:
    if ambulance_id not in GPS_STORE:
        return []
    
    # Phase 5: Route-aware selection first
    route_signals = get_route_ahead_signals(ambulance_id, max_signals)
    if route_signals:
        relevant = route_signals[:max_signals]
    else:
        # Fallback: Use route signals limited by distance instead of arbitrary radius
        gps = GPS_STORE[ambulance_id]
        from amb.core.startup import AMBULANCE_REGISTRY
        amb_data = AMBULANCE_REGISTRY.get(ambulance_id, {})
        hospital_id = amb_data.get('hospital_id')
        from amb.services.route_service import ROUTES
        
        if hospital_id and hospital_id in ROUTES:
            route = ROUTES[hospital_id]
            distances = []
            for sig_id in route:
                if sig_id not in SIGNAL_POSITIONS:
                    continue
                lat, lng = SIGNAL_POSITIONS[sig_id]
                dist = ((gps.lat - lat)**2 + (gps.lng - lng)**2)**0.5 * 111
                distances.append((sig_id, dist))
            distances.sort(key=lambda x: x[1])
            relevant = [sig for sig, dist in distances[:max_signals] if dist < 2.0]
        else:
            relevant = []
    
    # Filter out signals that ambulance has clearly passed (RESET or NORMAL with distance > 1km)
    gps = GPS_STORE[ambulance_id]
    filtered = []
    for sig_id in relevant:
        if sig_id not in SIGNAL_POSITIONS:
            continue
        lat, lng = SIGNAL_POSITIONS[sig_id]
        dist = ((gps.lat - lat)**2 + (gps.lng - lng)**2)**0.5 * 111
        
        # Exclude signals that are far behind (>1km) or in NORMAL/RESET state behind ambulance
        fsm = get_or_init_signal(sig_id)
        if dist > 1.5:  # Signal far behind
            continue
        filtered.append(sig_id)
    
    relevant = filtered
    
    # Phase 4 staggered activation (unchanged)
    for i, sig_id in enumerate(relevant):
        fsm = get_or_init_signal(sig_id)
        if fsm.current_state in {SignalState.GREEN_FOR_AMBULANCE, SignalState.PREPARE_PRIORITY}:
            continue  # Prevent double activation
        
        # Calculate distance for this signal
        if sig_id in SIGNAL_POSITIONS:
            gps = GPS_STORE[ambulance_id]
            lat, lng = SIGNAL_POSITIONS[sig_id]
            dist = ((gps.lat - lat)**2 + (gps.lng - lng)**2)**0.5 * 111
        else:
            dist = 999
        
        # Check if this ambulance is authorized for this signal (conflict resolution)
        from amb.services.conflict_resolver import RESOURCE_LOCKS
        winner = RESOURCE_LOCKS.get(sig_id)
        is_winner = (winner == ambulance_id) if winner else None
        
        if i > 0 and severity == "CRITICAL":
            prior_sig = relevant[i-1]
            prior_fsm = get_or_init_signal(prior_sig)
            if prior_fsm.current_state in {SignalState.PREPARE_PRIORITY, SignalState.GREEN_FOR_AMBULANCE}:
                fsm.transition(ambulance_id, dist, severity, conflict_winner=is_winner)  # Chain reaction
        else:
            fsm.transition(ambulance_id, dist, severity, conflict_winner=is_winner)
    
    return relevant
