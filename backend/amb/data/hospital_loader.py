"""
Hospital Data Loader for AMB

Loads hospital data from the shared source of truth at backend/data/hospitals.json.
This ensures AMB and MEDICO reference the SAME hospital data.

Usage:
    from amb.data.hospital_loader import load_hospitals, get_hospital_by_id, get_all_hospitals
    
    # Load at startup
    hospitals = load_hospitals()
    
    # Get a specific hospital
    hospital = get_hospital_by_id("HOSP-001")
    
    # Get all as dict for HOSPITALS_DB
    hospitals_db = get_hospitals_as_db()
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger("amb.data.hospitals")

# Path to shared hospital data (relative to backend directory)
SHARED_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "hospitals.json"


@dataclass
class Hospital:
    """Hospital destination for AMB routing."""
    id: str              # AMB string ID (HOSP-001)
    medico_id: int       # MEDICO integer ID (1)
    name: str
    city: str
    lat: float
    lng: float
    priority_level: str  # tertiary, secondary, primary
    active: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "address": f"{self.name}, {self.city}",
            "lat": self.lat,
            "lng": self.lng,
        }
    
    def to_routing_dict(self) -> Dict[str, Any]:
        """Convert to routing-only dictionary (for HOSPITALS_DB)."""
        return {
            "id": self.id,
            "name": self.name,
            "lat": self.lat,
            "lng": self.lng,
        }


# Module-level cache
_hospitals_cache: Optional[List[Hospital]] = None
_hospitals_db_cache: Optional[Dict[str, Dict]] = None


def _load_from_file() -> List[Hospital]:
    """Load hospital data from shared JSON file."""
    if not SHARED_DATA_PATH.exists():
        logger.error(f"Shared hospital data not found at {SHARED_DATA_PATH}")
        raise FileNotFoundError(
            f"Hospital data file not found: {SHARED_DATA_PATH}. "
            "This file is required for AMB-MEDICO integration."
        )
    
    try:
        with open(SHARED_DATA_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        hospitals = []
        for h in data.get("hospitals", []):
            hospitals.append(Hospital(
                id=h["id"],
                medico_id=h["medico_id"],
                name=h["name"],
                city=h.get("city", "Chennai"),
                lat=h["lat"],
                lng=h["lng"],
                priority_level=h.get("priority_level", "secondary"),
                active=h.get("active", True),
            ))
        
        logger.info(f"Loaded {len(hospitals)} hospitals from shared data file")
        return hospitals
    
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in hospital data file: {e}")
        raise ValueError(f"Invalid hospital data file: {e}")


def load_hospitals(force_reload: bool = False) -> List[Hospital]:
    """
    Load hospital data from shared source.
    
    Args:
        force_reload: If True, reload from file even if cached.
        
    Returns:
        List of Hospital objects.
    """
    global _hospitals_cache
    
    if _hospitals_cache is None or force_reload:
        _hospitals_cache = _load_from_file()
    
    return _hospitals_cache


def get_hospital_by_id(hospital_id: str) -> Optional[Hospital]:
    """
    Get a hospital by its AMB string ID.
    
    Args:
        hospital_id: AMB hospital ID (e.g., "HOSP-001")
        
    Returns:
        Hospital object or None if not found.
    """
    hospitals = load_hospitals()
    for h in hospitals:
        if h.id == hospital_id:
            return h
    return None


def get_hospital_by_medico_id(medico_id: int) -> Optional[Hospital]:
    """
    Get a hospital by its MEDICO integer ID.
    
    Args:
        medico_id: MEDICO hospital ID (e.g., 1)
        
    Returns:
        Hospital object or None if not found.
    """
    hospitals = load_hospitals()
    for h in hospitals:
        if h.medico_id == medico_id:
            return h
    return None


def get_all_hospitals(active_only: bool = True) -> List[Hospital]:
    """
    Get all hospitals.
    
    Args:
        active_only: If True, only return active hospitals.
        
    Returns:
        List of Hospital objects.
    """
    hospitals = load_hospitals()
    if active_only:
        return [h for h in hospitals if h.active]
    return hospitals


def get_hospitals_as_db(active_only: bool = True) -> Dict[str, Dict]:
    """
    Get hospitals as a dictionary keyed by ID (for HOSPITALS_DB).
    
    Args:
        active_only: If True, only include active hospitals.
        
    Returns:
        Dictionary with hospital ID as key and routing dict as value.
    """
    global _hospitals_db_cache
    
    if _hospitals_db_cache is None:
        hospitals = get_all_hospitals(active_only=active_only)
        _hospitals_db_cache = {
            h.id: h.to_routing_dict() for h in hospitals
        }
        logger.debug(f"Built HOSPITALS_DB with {len(_hospitals_db_cache)} entries")
    
    return _hospitals_db_cache


def get_medico_id_mapping() -> Dict[str, int]:
    """
    Get mapping from AMB hospital IDs to MEDICO IDs.
    
    Returns:
        Dictionary with AMB ID as key and MEDICO ID as value.
        Example: {"HOSP-001": 1, "HOSP-002": 2}
    """
    hospitals = load_hospitals()
    return {h.id: h.medico_id for h in hospitals}


def get_amb_id_mapping() -> Dict[int, str]:
    """
    Get mapping from MEDICO hospital IDs to AMB IDs.
    
    Returns:
        Dictionary with MEDICO ID as key and AMB ID as value.
        Example: {1: "HOSP-001", 2: "HOSP-002"}
    """
    hospitals = load_hospitals()
    return {h.medico_id: h.id for h in hospitals}


def validate_hospital_id(hospital_id: str) -> bool:
    """
    Validate that a hospital ID exists.
    
    Args:
        hospital_id: AMB hospital ID to validate.
        
    Returns:
        True if hospital exists and is active, False otherwise.
    """
    hospital = get_hospital_by_id(hospital_id)
    return hospital is not None and hospital.active


def amb_id_to_medico_id(amb_id: str) -> Optional[int]:
    """
    Convert AMB hospital ID to MEDICO hospital ID.
    
    Args:
        amb_id: AMB hospital ID (e.g., "HOSP-001")
        
    Returns:
        MEDICO integer ID or None if not found.
    """
    hospital = get_hospital_by_id(amb_id)
    return hospital.medico_id if hospital else None


def medico_id_to_amb_id(medico_id: int) -> Optional[str]:
    """
    Convert MEDICO hospital ID to AMB hospital ID.
    
    Args:
        medico_id: MEDICO hospital ID (e.g., 1)
        
    Returns:
        AMB string ID or None if not found.
    """
    hospital = get_hospital_by_medico_id(medico_id)
    return hospital.id if hospital else None


# Initialize on import
try:
    load_hospitals()
except Exception as e:
    logger.warning(f"Could not pre-load hospitals: {e}")
