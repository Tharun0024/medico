from amb.core.signal_fsm import TrafficSignalFSM, SignalState, TransitionReason
from amb.services.gps_simulator import GPS_STORE  # Phase 2 unchanged

SIGNAL_STORE: dict[str, TrafficSignalFSM] = {}  # signal_id -> FSM

def get_or_init_signal(signal_id: str = "SIGNAL-001") -> TrafficSignalFSM:
    if signal_id not in SIGNAL_STORE:
        SIGNAL_STORE[signal_id] = TrafficSignalFSM(signal_id)
    return SIGNAL_STORE[signal_id]

def update_signal_for_ambulance(ambulance_id: str, severity: str) -> tuple[SignalState, TransitionReason]:
    if ambulance_id not in GPS_STORE:
        raise ValueError("Ambulance not tracked")
    
    gps = GPS_STORE[ambulance_id]
    # Simulate single signal at fixed coords (Chennai demo: 13.0827, 80.2707)
    signal_lat, signal_lng = 13.0827, 80.2707
    distance_km = ((gps.lat - signal_lat)**2 + (gps.lng - signal_lng)**2)**0.5 * 111  # Euclidean approx km
    
    fsm = get_or_init_signal()
    new_state = fsm.transition(ambulance_id, distance_km, severity)
    return new_state, fsm.history[-1][1]
