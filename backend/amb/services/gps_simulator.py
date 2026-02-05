# backend/app/services/gps_simulator.py

import asyncio
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

from amb.services.traffic_llm import TrafficSnapshot, fetch_traffic_snapshot

# Route type and hardcoded routes (previously in utils/gps_routes.py)
Route = List[Tuple[float, float]]

ROUTES: Dict[str, Route] = {
    "default_city_loop": [
        (13.0827, 80.2707),
        (13.0835, 80.2720),
        (13.0842, 80.2735),
        (13.0850, 80.2750),
        (13.0860, 80.2765),
        (13.0870, 80.2780),
        (13.0880, 80.2795),
    ],
    "hospital_to_center": [
        (13.0500, 80.2500),
        (13.0550, 80.2550),
        (13.0600, 80.2600),
        (13.0650, 80.2650),
        (13.0700, 80.2700),
        (13.0750, 80.2720),
        (13.0800, 80.2740),
    ],
}


class GPSState:
    def __init__(
        self,
        lat: float,
        lng: float,
        speed_kmh: float,
        updated_at: datetime,
        route_name: str,
        route_index: int,
        is_running: bool,
        distance_traveled: float = 0.0,
    ) -> None:
        self.lat = lat
        self.lng = lng
        self.speed_kmh = speed_kmh
        self.updated_at = updated_at
        self.route_name = route_name
        self.route_index = route_index
        self.is_running = is_running
        self.distance_traveled = distance_traveled

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lat": self.lat,
            "lng": self.lng,
            "speed_kmh": self.speed_kmh,
            "updated_at": self.updated_at.isoformat(),
            "route_name": self.route_name,
            "route_index": self.route_index,
            "is_running": self.is_running,
            "distance_traveled": self.distance_traveled,
        }


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _interpolate_position(lat1: float, lng1: float, lat2: float, lng2: float, fraction: float):
    """Linear interpolation between two points (fraction 0.0 to 1.0)."""
    lat = lat1 + (lat2 - lat1) * fraction
    lng = lng1 + (lng2 - lng1) * fraction
    return lat, lng


GPS_STORE: Dict[str, GPSState] = {}          # ambulance_id -> GPSState
TRAFFIC_STORE: Dict[str, TrafficSnapshot] = {}  # ambulance_id -> TrafficSnapshot
_SIMULATION_TASKS: Dict[str, asyncio.Task] = {}  # ambulance_id -> task


async def _simulate_route_for_ambulance(
    ambulance_id: str,
    route: Route,
    route_name: str,
    step_seconds: float,
    speed_kmh: float,
) -> None:
    route_len = len(route)
    if route_len == 0:
        return

    idx = 0
    segment_progress = 0.0
    distance_traveled = 0.0
    
    # Get hospital destination coordinates for arrival detection
    from amb.core.startup import AMBULANCE_REGISTRY, HOSPITAL_REGISTRY
    amb_data = AMBULANCE_REGISTRY.get(ambulance_id, {})
    hospital_id = amb_data.get('hospital_id')
    hospital_coords = None
    if hospital_id and hospital_id in HOSPITAL_REGISTRY:
        hospital_coords = HOSPITAL_REGISTRY[hospital_id].get('location')  # [lat, lng]
    
    while True:
        gps_state = GPS_STORE.get(ambulance_id)
        if gps_state and not gps_state.is_running:
            break

        # Calculate distance traveled in this tick: speed (km/h) * time (h) = km
        distance_this_tick = speed_kmh * (step_seconds / 3600.0)
        distance_traveled += distance_this_tick
        
        # Get current segment endpoints
        next_idx = (idx + 1) % route_len
        lat1, lng1 = route[idx]
        lat2, lng2 = route[next_idx]
        segment_length = _haversine_km(lat1, lng1, lat2, lng2)
        
        # Move along segment
        if segment_length > 0:
            segment_progress += distance_this_tick / segment_length
            
            # If we passed the waypoint, move to next segment
            while segment_progress >= 1.0 and route_len > 1:
                segment_progress -= 1.0
                idx = next_idx
                next_idx = (idx + 1) % route_len
                lat1, lng1 = route[idx]
                lat2, lng2 = route[next_idx]
                segment_length = _haversine_km(lat1, lng1, lat2, lng2)
                if segment_length == 0:
                    break
            
            # Interpolate position
            lat, lng = _interpolate_position(lat1, lng1, lat2, lng2, min(segment_progress, 1.0))
        else:
            lat, lng = lat1, lng1
        
        # Check if reached hospital (within 100m)
        if hospital_coords:
            hosp_lat, hosp_lng = hospital_coords
            dist_to_hospital = _haversine_km(lat, lng, hosp_lat, hosp_lng)
            if dist_to_hospital < 0.1:  # 100 meters
                # Arrived at hospital - stop simulation and release locks
                GPS_STORE[ambulance_id] = GPSState(
                    lat=hosp_lat,
                    lng=hosp_lng,
                    speed_kmh=0.0,
                    updated_at=datetime.now(timezone.utc),
                    route_name=route_name,
                    route_index=idx,
                    is_running=False,
                    distance_traveled=distance_traveled,
                )
                # Release all signal locks held by this ambulance
                from amb.services.conflict_resolver import RESOURCE_LOCKS
                for resource_id, holder in list(RESOURCE_LOCKS.items()):
                    if holder == ambulance_id:
                        RESOURCE_LOCKS[resource_id] = None
                break
        
        now = datetime.now(timezone.utc)

        GPS_STORE[ambulance_id] = GPSState(
            lat=lat,
            lng=lng,
            speed_kmh=speed_kmh,
            updated_at=now,
            route_name=route_name,
            route_index=idx,
            is_running=True,
            distance_traveled=distance_traveled,
        )

        # Update traffic snapshot using LLM
        try:
            snapshot = await fetch_traffic_snapshot(lat=lat, lng=lng, speed_kmh=speed_kmh)
            TRAFFIC_STORE[ambulance_id] = snapshot
        except Exception as e:
            # For a hackathon demo, ignore LLM errors to keep simulation running
            print(f"Traffic LLM error for {ambulance_id}: {e}")
            pass

        await asyncio.sleep(step_seconds)


def start_simulation(
    ambulance_id: str,
    route_name: str = "default_city_loop",
    step_seconds: float = 3.0,
    speed_kmh: float = 40.0,
) -> None:
    route = ROUTES.get(route_name)
    if not route:
        raise ValueError(f"Route '{route_name}' not found")

    # Cancel existing task if running
    existing = _SIMULATION_TASKS.get(ambulance_id)
    if existing and not existing.done():
        existing.cancel()

    # Initial GPS state at first point
    lat, lng = route[0]
    now = datetime.now(timezone.utc)
    GPS_STORE[ambulance_id] = GPSState(
        lat=lat,
        lng=lng,
        speed_kmh=speed_kmh,
        updated_at=now,
        route_name=route_name,
        route_index=0,
        is_running=True,
        distance_traveled=0.0,
    )

    # Create task in background using asyncio.create_task
    try:
        task = asyncio.create_task(
            _simulate_route_for_ambulance(
                ambulance_id=ambulance_id,
                route=route,
                route_name=route_name,
                step_seconds=step_seconds,
                speed_kmh=speed_kmh,
            )
        )
        _SIMULATION_TASKS[ambulance_id] = task
    except RuntimeError:
        # If no event loop, create one in background thread
        import threading
        def run_in_thread():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            task = loop.create_task(
                _simulate_route_for_ambulance(
                    ambulance_id=ambulance_id,
                    route=route,
                    route_name=route_name,
                    step_seconds=step_seconds,
                    speed_kmh=speed_kmh,
                )
            )
            _SIMULATION_TASKS[ambulance_id] = task
            loop.run_forever()
        
        thread = threading.Thread(target=run_in_thread, daemon=True)
        thread.start()


def get_current_gps(ambulance_id: str) -> GPSState | None:
    return GPS_STORE.get(ambulance_id)


def get_latest_traffic(ambulance_id: str) -> TrafficSnapshot | None:
    return TRAFFIC_STORE.get(ambulance_id)
