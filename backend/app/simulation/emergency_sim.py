"""
Emergency Activity Simulator

Simulates incoming emergencies:
- Creates new emergency cases periodically
- Varies severity based on realistic distribution
- Triggers hospital assignment
"""

import random
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.simulation.base_simulator import BaseSimulator
from app.database.session import async_session_maker
from app.modules.emergencies.orchestrator import EmergencyOrchestrator
from app.modules.emergencies.models import EmergencySeverity
from app.modules.emergencies.schemas import EmergencyCreate


logger = logging.getLogger("medico.simulation.emergency")


# Realistic severity distribution
SEVERITY_WEIGHTS = {
    EmergencySeverity.CRITICAL: 0.1,   # 10% critical
    EmergencySeverity.HIGH: 0.3,       # 30% high
    EmergencySeverity.NORMAL: 0.6,     # 60% normal
}

# Sample emergency descriptions
EMERGENCY_DESCRIPTIONS = [
    "Chest pain, possible cardiac event",
    "Motor vehicle accident victim",
    "Severe respiratory distress",
    "Fall with head injury",
    "Acute abdominal pain",
    "Diabetic emergency",
    "Stroke symptoms",
    "Severe allergic reaction",
    "Industrial accident injury",
    "Cardiac arrest - CPR in progress",
    "Multiple trauma",
    "Burns - partial thickness",
    "Seizure activity",
    "Severe dehydration",
    "Poisoning/overdose",
]


class EmergencySimulator(BaseSimulator):
    """
    Simulates emergency case flow.
    
    Each tick:
    - Randomly decides whether to create an emergency
    - Selects severity based on realistic distribution
    - Creates emergency and attempts assignment
    """

    def __init__(
        self,
        interval_seconds: float = 15.0,
        emergency_probability: float = 0.7,  # 70% chance per tick
        enabled: bool = True,
    ):
        super().__init__(
            name="emergency",
            interval_seconds=interval_seconds,
            enabled=enabled,
        )
        self.emergency_probability = emergency_probability

    async def tick(self) -> None:
        """Execute one emergency simulation cycle."""
        # Random chance to create emergency
        if random.random() > self.emergency_probability:
            logger.debug("Simulation: No emergency this tick")
            return

        async with async_session_maker() as session:
            orchestrator = EmergencyOrchestrator(session)

            # Generate emergency
            severity = self._pick_severity()
            description = random.choice(EMERGENCY_DESCRIPTIONS)

            # Create emergency
            emergency = await orchestrator.create_emergency(
                EmergencyCreate(
                    severity=severity,
                    description=f"[SIM] {description}",
                )
            )

            logger.info(
                f"Simulation: Emergency #{emergency.id} created "
                f"(severity: {severity.value})"
            )

            # Attempt assignment
            try:
                result = await orchestrator.assign_hospital(emergency.id)
                if result.hospital_id:
                    logger.info(
                        f"Simulation: Emergency #{emergency.id} assigned to "
                        f"hospital {result.hospital_id} ({result.ward_type})"
                    )
                else:
                    logger.warning(
                        f"Simulation: Emergency #{emergency.id} failed to assign: "
                        f"{result.message}"
                    )
            except Exception as e:
                logger.error(f"Simulation: Assignment failed: {e}")

    def _pick_severity(self) -> EmergencySeverity:
        """Pick severity based on weighted distribution."""
        rand = random.random()
        cumulative = 0.0

        for severity, weight in SEVERITY_WEIGHTS.items():
            cumulative += weight
            if rand <= cumulative:
                return severity

        return EmergencySeverity.NORMAL  # Fallback


class EmergencyResolverSimulator(BaseSimulator):
    """
    Simulates emergency resolution.
    
    Periodically resolves old assigned emergencies to free up beds.
    """

    def __init__(
        self,
        interval_seconds: float = 30.0,
        resolve_probability: float = 0.5,
        enabled: bool = True,
    ):
        super().__init__(
            name="emergency_resolver",
            interval_seconds=interval_seconds,
            enabled=enabled,
        )
        self.resolve_probability = resolve_probability

    async def tick(self) -> None:
        """Resolve some assigned emergencies."""
        from sqlalchemy import select
        from app.modules.emergencies.models import EmergencyCase, EmergencyStatus

        async with async_session_maker() as session:
            # Find assigned emergencies
            result = await session.execute(
                select(EmergencyCase).where(
                    EmergencyCase.status == EmergencyStatus.ASSIGNED
                )
            )
            assigned = result.scalars().all()

            if not assigned:
                return

            # Pick some to resolve
            for emergency in assigned:
                if random.random() < self.resolve_probability:
                    orchestrator = EmergencyOrchestrator(session)
                    try:
                        await orchestrator.resolve_emergency(emergency.id)
                        logger.info(
                            f"Simulation: Emergency #{emergency.id} resolved"
                        )
                    except Exception as e:
                        logger.debug(f"Simulation: Could not resolve: {e}")
