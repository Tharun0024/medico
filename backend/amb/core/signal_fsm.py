from enum import Enum
from dataclasses import dataclass
from typing import Optional
import time

class SignalState(Enum):
    NORMAL = "normal"
    PREPARE_PRIORITY = "prepare_priority"
    GREEN_FOR_AMBULANCE = "green_for_ambulance"
    RESET = "reset"

@dataclass
class TransitionReason:
    reason: str
    severity: Optional[str] = None
    distance: Optional[float] = None
    conflict_winner: Optional[bool] = None  # Phase 7: True=won arbitration, False=suppressed

class TrafficSignalFSM:
    VALID_SEVERITIES = {"LOW", "MODERATE", "HIGH", "CRITICAL"}
    
    def __init__(self, signal_id: str):
        self.signal_id = signal_id
        self.current_state = SignalState.NORMAL
        self.current_owner: Optional[str] = None  # ambulance_id that has priority
        self.history: list[tuple[SignalState, TransitionReason]] = []
        self.green_start_time: Optional[float] = None
        self.max_green_time = 60  # seconds
    
    @property
    def green_time_remaining(self) -> float:
        """Get remaining green time in seconds"""
        if self.green_start_time and self.current_state == SignalState.GREEN_FOR_AMBULANCE:
            elapsed = time.time() - self.green_start_time
            return max(0, self.max_green_time - elapsed)
        return 0.0
    
    def reset(self):
        """Reset signal to normal state"""
        self.current_state = SignalState.NORMAL
        self.current_owner = None
        self.green_start_time = None

    def normalize_severity(self, severity: str) -> str:
        norm = severity.upper().strip()
        if norm not in self.VALID_SEVERITIES:
            raise ValueError(f"Invalid severity '{severity}'; must be {self.VALID_SEVERITIES}")
        return norm

    def transition(self, ambulance_id: str, distance_km: float, severity: str, 
                   conflict_winner: Optional[bool] = None) -> SignalState:
        severity = self.normalize_severity(severity)
        reason = TransitionReason(reason="", severity=severity, distance=distance_km, conflict_winner=conflict_winner)
        
        # NOTE: Euclidean distance used for prototype simplicity (lat/lon degrees * 111km/deg approx).
        # Can be replaced with road-distance in Phase 5.
        
        if self.current_state == SignalState.NORMAL:
            if conflict_winner is False:
                reason.reason = "Suppressed by conflict resolution (lost arbitration)"
            elif distance_km < 0.5 and severity in {"HIGH", "CRITICAL"}:
                self.current_state = SignalState.PREPARE_PRIORITY
                self.current_owner = ambulance_id
                reason.reason = "Ambulance approaching within 500m with HIGH/CRITICAL severity"
            else:
                reason.reason = "No priority trigger (distance >= 0.5km or severity LOW/MODERATE)"
        
        elif self.current_state == SignalState.PREPARE_PRIORITY:
            if distance_km < 0.2:
                self.current_state = SignalState.GREEN_FOR_AMBULANCE
                self.current_owner = ambulance_id
                self.green_start_time = time.time()
                reason.reason = "Ambulance close (<200m); grant green"
            elif distance_km > 1.0:
                self.current_state = SignalState.RESET
                self.current_owner = None
                reason.reason = "Ambulance passed (>1km); reset"
        
        elif self.current_state == SignalState.GREEN_FOR_AMBULANCE:
            if distance_km > 1.0 or (self.green_start_time and (time.time() - self.green_start_time > self.max_green_time)):
                self.current_state = SignalState.RESET
                self.current_owner = None
                reason.reason = "Ambulance cleared (>1km) or max green time exceeded; reset"
        
        elif self.current_state == SignalState.RESET:
            self.current_state = SignalState.NORMAL
            self.current_owner = None
            reason.reason = "Reset cycle complete"
            self.green_start_time = None
        
        self.history.append((self.current_state, reason))
        if len(self.history) > 50:
            self.history.pop(0)
        return self.current_state
