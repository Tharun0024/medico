"""
MEDICO Hospital Seeding Module

Seeds the MEDICO database with hospitals from the shared hospitals.json file.
Uses EXPLICIT ID assignment to guarantee MEDICO and AMB use identical hospital IDs.

Usage:
    # From main.py lifespan:
    from app.database.seed_hospitals import seed_hospitals_from_json, validate_hospitals
    await seed_hospitals_from_json(session)
    await validate_hospitals(session)  # Raises on mismatch
    
    # CLI seeding:
    python -m app.database.seed_hospitals

CRITICAL:
- Hospital IDs are EXPLICIT, not auto-incremented
- All hospitals must come from backend/data/hospitals.json
- Validation fails LOUDLY on any mismatch
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType

logger = logging.getLogger("medico.seed_hospitals")

# Path to shared hospital data
HOSPITALS_JSON_PATH = Path(__file__).parent.parent.parent / "data" / "hospitals.json"

# Coordinate tolerance for validation (degrees)
COORDINATE_TOLERANCE = 0.001  # ~111 meters


@dataclass
class HospitalValidationError:
    """Represents a hospital validation error."""
    hospital_id: int
    amb_id: str
    field: str
    expected: Any
    actual: Any
    
    def __str__(self) -> str:
        return f"Hospital {self.hospital_id} ({self.amb_id}): {self.field} mismatch - expected {self.expected}, got {self.actual}"


class HospitalDataMismatchError(Exception):
    """Raised when hospital data doesn't match expected values."""
    
    def __init__(self, errors: List[HospitalValidationError]):
        self.errors = errors
        message = f"Hospital data validation failed with {len(errors)} error(s):\n"
        for err in errors[:10]:  # Show first 10 errors
            message += f"  - {err}\n"
        if len(errors) > 10:
            message += f"  ... and {len(errors) - 10} more errors\n"
        super().__init__(message)


def load_hospitals_json() -> List[Dict[str, Any]]:
    """
    Load hospital data from shared JSON file.
    
    Returns:
        List of hospital dictionaries with id, medico_id, name, city, lat, lng, etc.
        
    Raises:
        FileNotFoundError: If hospitals.json doesn't exist
        ValueError: If JSON is invalid
    """
    if not HOSPITALS_JSON_PATH.exists():
        raise FileNotFoundError(
            f"Shared hospital data not found at {HOSPITALS_JSON_PATH}. "
            "This file is REQUIRED for MEDICO-AMB integration."
        )
    
    try:
        with open(HOSPITALS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        hospitals = data.get("hospitals", [])
        if not hospitals:
            raise ValueError("hospitals.json contains no hospitals")
        
        logger.info(f"Loaded {len(hospitals)} hospitals from {HOSPITALS_JSON_PATH}")
        return hospitals
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in hospitals.json: {e}")


async def get_existing_hospitals(session: AsyncSession) -> Dict[int, Hospital]:
    """
    Fetch all existing hospitals from the database.
    
    Returns:
        Dictionary mapping hospital ID to Hospital object
    """
    result = await session.execute(select(Hospital))
    hospitals = result.scalars().all()
    return {h.id: h for h in hospitals}


async def seed_hospitals_from_json(
    session: AsyncSession,
    default_icu_capacity: int = 20,
    default_hdu_capacity: int = 40,
    default_general_capacity: int = 100,
) -> Tuple[int, int]:
    """
    Seed hospitals from the shared hospitals.json file.
    
    Uses EXPLICIT ID assignment - medico_id from JSON becomes Hospital.id.
    Only creates hospitals that don't exist. Never modifies existing hospitals.
    
    Args:
        session: Database session
        default_icu_capacity: Default ICU beds for new hospitals
        default_hdu_capacity: Default HDU beds for new hospitals
        default_general_capacity: Default General beds for new hospitals
        
    Returns:
        Tuple of (created_count, skipped_count)
        
    Raises:
        FileNotFoundError: If hospitals.json doesn't exist
        ValueError: If JSON is invalid or hospital data is malformed
    """
    hospitals_data = load_hospitals_json()
    existing = await get_existing_hospitals(session)
    
    created = 0
    skipped = 0
    
    for h_data in hospitals_data:
        medico_id = h_data.get("medico_id")
        amb_id = h_data.get("id")
        name = h_data.get("name")
        city = h_data.get("city", "Chennai")
        lat = h_data.get("lat")
        lng = h_data.get("lng")
        active = h_data.get("active", True)
        
        if not all([medico_id, amb_id, name]):
            raise ValueError(
                f"Invalid hospital data: missing required fields. "
                f"Got: medico_id={medico_id}, id={amb_id}, name={name}"
            )
        
        if medico_id in existing:
            logger.debug(f"Hospital {medico_id} ({amb_id}) already exists, skipping")
            skipped += 1
            continue
        
        # Create hospital with EXPLICIT ID
        hospital = Hospital(
            id=medico_id,  # EXPLICIT - not auto-increment
            amb_id=amb_id,
            name=name,
            city=city,
            lat=lat,
            lng=lng,
            status=HospitalStatus.ACTIVE if active else HospitalStatus.INACTIVE,
            created_at=datetime.utcnow(),
        )
        session.add(hospital)
        
        # Create default bed groups
        bed_groups = [
            BedGroup(
                hospital_id=medico_id,
                ward_type=WardType.ICU,
                total_capacity=default_icu_capacity,
                occupied=0,
            ),
            BedGroup(
                hospital_id=medico_id,
                ward_type=WardType.HDU,
                total_capacity=default_hdu_capacity,
                occupied=0,
            ),
            BedGroup(
                hospital_id=medico_id,
                ward_type=WardType.GENERAL,
                total_capacity=default_general_capacity,
                occupied=0,
            ),
        ]
        for bg in bed_groups:
            session.add(bg)
        
        logger.info(f"Created hospital: id={medico_id}, amb_id={amb_id}, name={name}")
        created += 1
    
    await session.commit()
    
    logger.info(f"Hospital seeding complete: {created} created, {skipped} skipped")
    return created, skipped


async def validate_hospitals(
    session: AsyncSession,
    strict: bool = True,
) -> List[HospitalValidationError]:
    """
    Validate that database hospitals match the shared hospitals.json exactly.
    
    Checks:
    - Hospital count matches
    - All expected hospital IDs exist
    - No extra hospitals in database
    - Names match
    - AMB IDs match
    - Coordinates match (within tolerance)
    
    Args:
        session: Database session
        strict: If True, raises HospitalDataMismatchError on any mismatch
        
    Returns:
        List of validation errors (empty if all valid)
        
    Raises:
        HospitalDataMismatchError: If strict=True and mismatches found
    """
    errors: List[HospitalValidationError] = []
    
    hospitals_data = load_hospitals_json()
    existing = await get_existing_hospitals(session)
    
    expected_ids = {h["medico_id"] for h in hospitals_data}
    actual_ids = set(existing.keys())
    
    # Check for missing hospitals
    missing = expected_ids - actual_ids
    for mid in missing:
        h_data = next(h for h in hospitals_data if h["medico_id"] == mid)
        errors.append(HospitalValidationError(
            hospital_id=mid,
            amb_id=h_data["id"],
            field="existence",
            expected="exists",
            actual="missing",
        ))
    
    # Check for extra hospitals
    extra = actual_ids - expected_ids
    for mid in extra:
        hospital = existing[mid]
        errors.append(HospitalValidationError(
            hospital_id=mid,
            amb_id=getattr(hospital, 'amb_id', 'UNKNOWN'),
            field="existence",
            expected="not in hospitals.json",
            actual="exists in DB",
        ))
    
    # Validate matching hospitals
    for h_data in hospitals_data:
        medico_id = h_data["medico_id"]
        if medico_id not in existing:
            continue  # Already reported as missing
        
        hospital = existing[medico_id]
        amb_id = h_data["id"]
        
        # Check AMB ID
        if hospital.amb_id != amb_id:
            errors.append(HospitalValidationError(
                hospital_id=medico_id,
                amb_id=amb_id,
                field="amb_id",
                expected=amb_id,
                actual=hospital.amb_id,
            ))
        
        # Check name
        if hospital.name != h_data["name"]:
            errors.append(HospitalValidationError(
                hospital_id=medico_id,
                amb_id=amb_id,
                field="name",
                expected=h_data["name"],
                actual=hospital.name,
            ))
        
        # Check coordinates
        expected_lat = h_data.get("lat")
        expected_lng = h_data.get("lng")
        
        if expected_lat is not None and hospital.lat is not None:
            if abs(hospital.lat - expected_lat) > COORDINATE_TOLERANCE:
                errors.append(HospitalValidationError(
                    hospital_id=medico_id,
                    amb_id=amb_id,
                    field="lat",
                    expected=expected_lat,
                    actual=hospital.lat,
                ))
        
        if expected_lng is not None and hospital.lng is not None:
            if abs(hospital.lng - expected_lng) > COORDINATE_TOLERANCE:
                errors.append(HospitalValidationError(
                    hospital_id=medico_id,
                    amb_id=amb_id,
                    field="lng",
                    expected=expected_lng,
                    actual=hospital.lng,
                ))
    
    # Report results
    if errors:
        logger.error(f"Hospital validation found {len(errors)} error(s)")
        for err in errors:
            logger.error(f"  {err}")
        
        if strict:
            raise HospitalDataMismatchError(errors)
    else:
        logger.info(
            f"Hospital validation passed: {len(existing)} hospitals match hospitals.json"
        )
    
    return errors


async def seed_and_validate(
    session: AsyncSession,
    default_icu_capacity: int = 20,
    default_hdu_capacity: int = 40,
    default_general_capacity: int = 100,
) -> None:
    """
    Seed hospitals from JSON and validate the result.
    
    This is the recommended function to call from main.py lifespan.
    
    Args:
        session: Database session
        default_*_capacity: Default bed capacities for new hospitals
        
    Raises:
        HospitalDataMismatchError: If validation fails after seeding
    """
    created, skipped = await seed_hospitals_from_json(
        session,
        default_icu_capacity=default_icu_capacity,
        default_hdu_capacity=default_hdu_capacity,
        default_general_capacity=default_general_capacity,
    )
    
    await validate_hospitals(session, strict=True)
    
    logger.info(
        f"Hospital seed and validate complete: "
        f"{created} created, {skipped} already existed, validation passed"
    )


# CLI support
if __name__ == "__main__":
    import asyncio
    from app.database.session import async_session_maker
    from app.database.init_db import init_db
    
    async def main():
        logging.basicConfig(level=logging.INFO)
        
        print("Initializing database...")
        await init_db()
        
        print("Seeding hospitals from hospitals.json...")
        async with async_session_maker() as session:
            await seed_and_validate(session)
        
        print("Done!")
    
    asyncio.run(main())
