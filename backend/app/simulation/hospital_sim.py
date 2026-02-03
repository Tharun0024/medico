"""
Hospital Activity Simulator

Simulates realistic hospital activity:
- Random patient admissions
- Random patient discharges
- Bed occupancy fluctuations
"""

import random
import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.simulation.base_simulator import BaseSimulator
from app.database.session import async_session_maker
from app.modules.beds.models import BedGroup
from app.modules.beds.service import BedGroupService
from app.modules.beds.schemas import OccupancyUpdate


logger = logging.getLogger("medico.simulation.hospital")


class HospitalActivitySimulator(BaseSimulator):
    """
    Simulates hospital bed activity.
    
    Each tick:
    - Randomly selects a bed group
    - Decides to admit or discharge (weighted by occupancy)
    - Updates occupancy via the service layer
    """

    def __init__(
        self,
        interval_seconds: float = 8.0,
        admission_weight: float = 0.6,  # Slight bias toward admissions
        enabled: bool = True,
    ):
        super().__init__(
            name="hospital_activity",
            interval_seconds=interval_seconds,
            enabled=enabled,
        )
        self.admission_weight = admission_weight

    async def tick(self) -> None:
        """Execute one hospital activity cycle."""
        async with async_session_maker() as session:
            # Get all bed groups
            result = await session.execute(select(BedGroup))
            bed_groups = result.scalars().all()

            if not bed_groups:
                logger.debug("No bed groups available for simulation")
                return

            # Pick a random bed group
            bed_group = random.choice(bed_groups)

            # Decide action based on current occupancy
            action = self._decide_action(bed_group)

            if action == "admit":
                new_occupied = bed_group.occupied + 1
            elif action == "discharge":
                new_occupied = bed_group.occupied - 1
            else:
                return  # No action

            # Update via service
            service = BedGroupService(session)
            try:
                await service.update_occupancy(
                    bed_group.id,
                    OccupancyUpdate(occupied=new_occupied)
                )
                logger.info(
                    f"Simulation: {action} in hospital {bed_group.hospital_id} "
                    f"{bed_group.ward_type.value.upper()} -> {new_occupied}/{bed_group.total_capacity}"
                )
            except Exception as e:
                logger.debug(f"Simulation action skipped: {e}")

    def _decide_action(self, bed_group: BedGroup) -> Optional[str]:
        """
        Decide whether to admit or discharge.
        
        Logic:
        - If full, can only discharge
        - If empty, can only admit
        - Otherwise, weighted random choice
        - Higher occupancy increases discharge probability
        """
        occupancy_rate = bed_group.occupied / bed_group.total_capacity

        if bed_group.occupied >= bed_group.total_capacity:
            return "discharge" if random.random() < 0.7 else None

        if bed_group.occupied <= 0:
            return "admit" if random.random() < 0.8 else None

        # Adjust weights based on occupancy
        # Higher occupancy = more likely to discharge
        adjusted_admission_weight = self.admission_weight * (1 - occupancy_rate * 0.5)

        if random.random() < adjusted_admission_weight:
            return "admit"
        else:
            return "discharge" if random.random() < 0.6 else None
