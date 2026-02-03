"""
Emergency Orchestrator

Core orchestration logic for emergency case handling.
Handles hospital assignment and bed reservation.
"""

from datetime import datetime
from typing import Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.event_bus import emit_event, EventType
from app.modules.emergencies.models import EmergencyCase, EmergencySeverity, EmergencyStatus
from app.modules.emergencies.schemas import (
    EmergencyCreate,
    EmergencyResponse,
    EmergencyList,
    AssignmentResult,
    HospitalCandidate,
)
from app.modules.beds.models import BedGroup, WardType
from app.modules.hospitals.models import Hospital, HospitalStatus


class EmergencyOrchestrator:
    """
    Orchestrator for emergency case management.
    
    Responsibilities:
    - Create emergency cases
    - Find suitable hospitals based on bed availability
    - Assign hospitals and reserve beds
    - Track emergency lifecycle
    """

    # Mapping of severity to preferred ward types (in order of preference)
    SEVERITY_WARD_MAPPING = {
        EmergencySeverity.CRITICAL: [WardType.ICU],
        EmergencySeverity.HIGH: [WardType.ICU, WardType.HDU],
        EmergencySeverity.NORMAL: [WardType.HDU, WardType.GENERAL],
    }

    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_emergency(self, data: EmergencyCreate) -> EmergencyResponse:
        """Create a new emergency case."""
        emergency = EmergencyCase(
            severity=data.severity,
            description=data.description,
            status=EmergencyStatus.CREATED,
        )
        self._session.add(emergency)
        await self._session.commit()
        await self._session.refresh(emergency)

        # Emit event
        emit_event(EventType.EMERGENCY_CREATED, {
            "emergency_id": emergency.id,
            "severity": emergency.severity.value,
            "status": emergency.status.value,
        })

        return EmergencyResponse.model_validate(emergency)

    async def assign_hospital(self, emergency_id: int) -> AssignmentResult:
        """
        Assign a hospital to an emergency case.
        
        Logic:
        1. Get emergency case
        2. Determine required ward types based on severity
        3. Find hospitals with available beds in those wards
        4. Rank by available capacity (highest first)
        5. Assign best match and reserve bed
        """
        # Get emergency
        emergency = await self._get_emergency(emergency_id)
        
        if emergency.status != EmergencyStatus.CREATED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Emergency {emergency_id} is already {emergency.status.value}",
            )

        # Get preferred ward types for this severity
        preferred_wards = self.SEVERITY_WARD_MAPPING[emergency.severity]

        # Find candidates
        candidates = await self._find_hospital_candidates(preferred_wards)

        if not candidates:
            # No hospitals available
            emergency.status = EmergencyStatus.FAILED
            await self._session.commit()

            # Emit failure event
            emit_event(EventType.EMERGENCY_FAILED, {
                "emergency_id": emergency_id,
                "severity": emergency.severity.value,
                "reason": "no_available_beds",
            })

            return AssignmentResult(
                emergency_id=emergency_id,
                status=EmergencyStatus.FAILED,
                message=f"No hospitals with available {preferred_wards[0].value.upper()} beds found",
            )

        # Select best candidate (highest available beds)
        best = candidates[0]

        # Reserve bed
        await self._reserve_bed(best.bed_group_id)

        # Update emergency
        emergency.status = EmergencyStatus.ASSIGNED
        emergency.hospital_id = best.hospital_id
        emergency.bed_group_id = best.bed_group_id
        emergency.assigned_at = datetime.utcnow()
        await self._session.commit()

        # Emit events
        emit_event(EventType.BED_RESERVED, {
            "bed_group_id": best.bed_group_id,
            "hospital_id": best.hospital_id,
            "ward_type": best.ward_type,
            "emergency_id": emergency_id,
        })

        emit_event(EventType.EMERGENCY_ASSIGNED, {
            "emergency_id": emergency_id,
            "hospital_id": best.hospital_id,
            "bed_group_id": best.bed_group_id,
            "severity": emergency.severity.value,
        })

        return AssignmentResult(
            emergency_id=emergency_id,
            status=EmergencyStatus.ASSIGNED,
            hospital_id=best.hospital_id,
            hospital_name=best.hospital_name,
            bed_group_id=best.bed_group_id,
            ward_type=best.ward_type,
            message=f"Assigned to {best.hospital_name} ({best.ward_type.upper()}, {best.available_beds - 1} beds remaining)",
        )

    async def resolve_emergency(self, emergency_id: int) -> EmergencyResponse:
        """Mark an emergency as resolved and release the bed."""
        emergency = await self._get_emergency(emergency_id)

        if emergency.status == EmergencyStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Emergency {emergency_id} is already resolved",
            )

        # Release bed if one was assigned
        released_bed_group_id = emergency.bed_group_id
        if released_bed_group_id:
            await self._release_bed(released_bed_group_id)

        emergency.status = EmergencyStatus.RESOLVED
        emergency.resolved_at = datetime.utcnow()
        await self._session.commit()
        await self._session.refresh(emergency)

        # Emit events
        if released_bed_group_id:
            emit_event(EventType.BED_RELEASED, {
                "bed_group_id": released_bed_group_id,
                "hospital_id": emergency.hospital_id,
                "emergency_id": emergency_id,
            })

        emit_event(EventType.EMERGENCY_RESOLVED, {
            "emergency_id": emergency_id,
            "hospital_id": emergency.hospital_id,
            "severity": emergency.severity.value,
        })

        return EmergencyResponse.model_validate(emergency)

    async def list_emergencies(
        self,
        status_filter: Optional[EmergencyStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> EmergencyList:
        """List emergency cases with optional status filter."""
        query = select(EmergencyCase)
        count_query = select(func.count(EmergencyCase.id))

        if status_filter:
            query = query.where(EmergencyCase.status == status_filter)
            count_query = count_query.where(EmergencyCase.status == status_filter)

        query = query.order_by(EmergencyCase.created_at.desc()).offset(skip).limit(limit)

        result = await self._session.execute(query)
        emergencies = result.scalars().all()

        count_result = await self._session.execute(count_query)
        total = count_result.scalar_one()

        return EmergencyList(
            items=[EmergencyResponse.model_validate(e) for e in emergencies],
            total=total,
        )

    async def get_candidates(self, severity: EmergencySeverity) -> list[HospitalCandidate]:
        """Get ranked hospital candidates for a given severity."""
        preferred_wards = self.SEVERITY_WARD_MAPPING[severity]
        return await self._find_hospital_candidates(preferred_wards)

    async def _get_emergency(self, emergency_id: int) -> EmergencyCase:
        """Fetch emergency by ID or raise 404."""
        result = await self._session.execute(
            select(EmergencyCase).where(EmergencyCase.id == emergency_id)
        )
        emergency = result.scalar_one_or_none()
        if not emergency:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Emergency {emergency_id} not found",
            )
        return emergency

    async def _find_hospital_candidates(
        self, ward_types: list[WardType]
    ) -> list[HospitalCandidate]:
        """
        Find hospitals with available beds in specified ward types.
        Returns candidates sorted by available beds (descending).
        """
        candidates = []

        for ward_type in ward_types:
            # Query hospitals with active status and available beds in this ward
            query = (
                select(Hospital, BedGroup)
                .join(BedGroup, Hospital.id == BedGroup.hospital_id)
                .where(
                    Hospital.status == HospitalStatus.ACTIVE,
                    BedGroup.ward_type == ward_type,
                    BedGroup.occupied < BedGroup.total_capacity,
                )
            )

            result = await self._session.execute(query)
            rows = result.all()

            for hospital, bed_group in rows:
                available = bed_group.total_capacity - bed_group.occupied
                occupancy_rate = (bed_group.occupied / bed_group.total_capacity) * 100

                candidates.append(
                    HospitalCandidate(
                        hospital_id=hospital.id,
                        hospital_name=hospital.name,
                        bed_group_id=bed_group.id,
                        ward_type=ward_type.value,
                        available_beds=available,
                        occupancy_rate=occupancy_rate,
                    )
                )

            # If we found candidates for this ward type, stop looking at lower priority wards
            if candidates:
                break

        # Sort by available beds (descending)
        candidates.sort(key=lambda c: c.available_beds, reverse=True)
        return candidates

    async def _reserve_bed(self, bed_group_id: int) -> None:
        """Reserve a bed by incrementing occupied count."""
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.id == bed_group_id)
        )
        bed_group = result.scalar_one()

        if bed_group.occupied >= bed_group.total_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="No beds available in selected ward",
            )

        bed_group.occupied += 1
        await self._session.flush()

    async def _release_bed(self, bed_group_id: int) -> None:
        """Release a bed by decrementing occupied count."""
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.id == bed_group_id)
        )
        bed_group = result.scalar_one_or_none()

        if bed_group and bed_group.occupied > 0:
            bed_group.occupied -= 1
            await self._session.flush()
