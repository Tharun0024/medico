"""
Waste Generation Simulator

Simulates biomedical waste generation:
- Correlates with bed occupancy
- Increases with emergency activity
- Emits waste events for future processing
"""

import random
import logging
from datetime import datetime

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.simulation.base_simulator import BaseSimulator
from app.database.session import async_session_maker
from app.modules.beds.models import BedGroup, WardType
from app.core.event_bus import emit_event, EventType, Event, event_bus


logger = logging.getLogger("medico.simulation.waste")


# Waste generation rates (kg per occupied bed per tick)
WASTE_RATES = {
    WardType.ICU: 2.5,      # ICU generates most waste
    WardType.HDU: 1.5,      # HDU moderate
    WardType.GENERAL: 0.8,  # General least
}

# Waste categories
WASTE_CATEGORIES = [
    "infectious",
    "pathological", 
    "sharps",
    "pharmaceutical",
    "chemical",
    "general_medical",
]


class WasteSimulator(BaseSimulator):
    """
    Simulates biomedical waste generation.
    
    Each tick:
    - Calculates waste based on bed occupancy
    - Adds randomness for realism
    - Emits waste events (no persistence yet)
    """

    def __init__(
        self,
        interval_seconds: float = 20.0,
        variance_factor: float = 0.3,  # ±30% randomness
        enabled: bool = True,
    ):
        super().__init__(
            name="waste_generation",
            interval_seconds=interval_seconds,
            enabled=enabled,
        )
        self.variance_factor = variance_factor
        self._cumulative_waste: dict[int, float] = {}  # hospital_id -> kg

    async def tick(self) -> None:
        """Calculate and emit waste generation events."""
        async with async_session_maker() as session:
            # Get all bed groups with occupancy
            result = await session.execute(select(BedGroup))
            bed_groups = result.scalars().all()

            if not bed_groups:
                return

            # Group by hospital
            hospital_waste: dict[int, dict] = {}

            for bg in bed_groups:
                if bg.hospital_id not in hospital_waste:
                    hospital_waste[bg.hospital_id] = {
                        "total_kg": 0.0,
                        "by_ward": {},
                        "by_category": {cat: 0.0 for cat in WASTE_CATEGORIES},
                    }

                # Calculate waste for this bed group
                base_rate = WASTE_RATES.get(bg.ward_type, 1.0)
                variance = random.uniform(
                    1 - self.variance_factor,
                    1 + self.variance_factor
                )
                waste_kg = bg.occupied * base_rate * variance

                hospital_waste[bg.hospital_id]["total_kg"] += waste_kg
                hospital_waste[bg.hospital_id]["by_ward"][bg.ward_type.value] = waste_kg

                # Distribute across categories
                self._distribute_categories(
                    hospital_waste[bg.hospital_id]["by_category"],
                    waste_kg,
                    bg.ward_type,
                )

            # Emit events for each hospital
            for hospital_id, waste_data in hospital_waste.items():
                if waste_data["total_kg"] > 0:
                    # Update cumulative
                    self._cumulative_waste[hospital_id] = (
                        self._cumulative_waste.get(hospital_id, 0.0) 
                        + waste_data["total_kg"]
                    )

                    # Emit waste generated event
                    emit_event(EventType.WASTE_GENERATED, {
                        "hospital_id": hospital_id,
                        "generated_kg": round(waste_data["total_kg"], 2),
                        "cumulative_kg": round(self._cumulative_waste[hospital_id], 2),
                        "by_ward": {k: round(v, 2) for k, v in waste_data["by_ward"].items()},
                        "by_category": {k: round(v, 2) for k, v in waste_data["by_category"].items()},
                    })

                    # Check thresholds
                    await self._check_thresholds(hospital_id)

            logger.debug(
                f"Simulation: Waste generated for {len(hospital_waste)} hospitals"
            )

    def _distribute_categories(
        self,
        categories: dict,
        total_kg: float,
        ward_type: WardType,
    ) -> None:
        """Distribute waste across categories based on ward type."""
        # ICU has more sharps and pharmaceutical waste
        # General has more general medical waste
        if ward_type == WardType.ICU:
            weights = {
                "infectious": 0.25,
                "pathological": 0.15,
                "sharps": 0.25,
                "pharmaceutical": 0.20,
                "chemical": 0.05,
                "general_medical": 0.10,
            }
        elif ward_type == WardType.HDU:
            weights = {
                "infectious": 0.20,
                "pathological": 0.10,
                "sharps": 0.20,
                "pharmaceutical": 0.15,
                "chemical": 0.05,
                "general_medical": 0.30,
            }
        else:
            weights = {
                "infectious": 0.15,
                "pathological": 0.05,
                "sharps": 0.15,
                "pharmaceutical": 0.10,
                "chemical": 0.05,
                "general_medical": 0.50,
            }

        for category, weight in weights.items():
            categories[category] += total_kg * weight

    async def _check_thresholds(self, hospital_id: int) -> None:
        """Check if waste thresholds are breached."""
        cumulative = self._cumulative_waste.get(hospital_id, 0)

        # Warning at 100kg, critical at 200kg (example thresholds)
        if cumulative >= 200:
            emit_event(EventType.WASTE_THRESHOLD_CRITICAL, {
                "hospital_id": hospital_id,
                "cumulative_kg": round(cumulative, 2),
                "threshold_kg": 200,
                "action_required": "immediate_collection",
            })
            logger.warning(
                f"Simulation: Hospital {hospital_id} waste CRITICAL ({cumulative:.1f}kg)"
            )
        elif cumulative >= 100:
            emit_event(EventType.WASTE_THRESHOLD_WARNING, {
                "hospital_id": hospital_id,
                "cumulative_kg": round(cumulative, 2),
                "threshold_kg": 100,
                "action_required": "schedule_collection",
            })

    def reset_cumulative(self, hospital_id: int) -> None:
        """Reset cumulative waste (e.g., after collection)."""
        self._cumulative_waste[hospital_id] = 0.0
        emit_event(EventType.WASTE_COLLECTED, {
            "hospital_id": hospital_id,
            "collected_at": datetime.utcnow().isoformat(),
        })
