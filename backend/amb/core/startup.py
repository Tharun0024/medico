import json
from pathlib import Path
from typing import Dict, Any, List
from amb.services.signal_service import SIGNAL_STORE
from fastapi import FastAPI

from amb.core.config import settings


# Shared data directory (backend/data/) for cross-system consistency
SHARED_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

AMBULANCE_REGISTRY: Dict[str, Dict[str, Any]] = {}
HOSPITAL_REGISTRY: Dict[str, Dict[str, Any]] = {}


def _load_json(path: Path) -> List[dict]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_static_data() -> None:
    ambulances_path = settings.DATA_DIR / "ambulance.json"
    # Use shared hospitals.json for MEDICO+AMB alignment
    hospitals_path = SHARED_DATA_DIR / "hospitals.json"

    ambulances = _load_json(ambulances_path)
    hospitals_data = _load_json(hospitals_path)
    hospitals = hospitals_data.get("hospitals", hospitals_data) if isinstance(hospitals_data, dict) else hospitals_data

    AMBULANCE_REGISTRY.clear()
    HOSPITAL_REGISTRY.clear()

    for amb in ambulances:
        AMBULANCE_REGISTRY[amb["ambulance_id"]] = amb

    # Shared hospitals.json uses "id" (e.g., HOSP-001), store as hospital_id for consistency
    for hosp in hospitals:
        hospital_id = hosp.get("id") or hosp.get("hospital_id")
        hosp["hospital_id"] = hospital_id  # Ensure hospital_id key exists
        HOSPITAL_REGISTRY[hospital_id] = hosp


def register_startup_events(app: FastAPI) -> None:
    @app.on_event("startup")
    async def on_startup():
        load_static_data()
SIGNAL_STORE.clear()