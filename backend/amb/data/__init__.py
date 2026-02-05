"""
AMB Data Module

Contains static data loaders and data files for the AMB system.

Key components:
- hospital_loader.py: Loads hospital data from shared source
- ambulance.json: Ambulance fleet configuration
- signals.json: Traffic signal positions
- roads.json: Road network for routing
"""

from amb.data.hospital_loader import (
    load_hospitals,
    get_hospital_by_id,
    get_hospital_by_medico_id,
    get_all_hospitals,
    get_hospitals_as_db,
    get_medico_id_mapping,
    get_amb_id_mapping,
    amb_id_to_medico_id,
    medico_id_to_amb_id,
    validate_hospital_id,
)

__all__ = [
    "load_hospitals",
    "get_hospital_by_id",
    "get_hospital_by_medico_id",
    "get_all_hospitals",
    "get_hospitals_as_db",
    "get_medico_id_mapping",
    "get_amb_id_mapping",
    "amb_id_to_medico_id",
    "medico_id_to_amb_id",
    "validate_hospital_id",
]
