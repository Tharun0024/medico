"""
Medical Staff Dashboard Service

Aggregates ward-level data for Medical Staff dashboard.
Read-only, hospital-scoped view.
"""

from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType
from app.modules.emergencies.models import EmergencyCase, EmergencyStatus, EmergencySeverity
from app.api.schemas.medical_dashboard import (
    MedicalDashboard,
    WardStatus,
    WardsResponse,
)


class MedicalDashboardService:
    """
    Service for Medical Staff dashboard data aggregation.
    
    Provides read-only, ward-level operational view for a specific hospital.
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_dashboard(self, hospital_id: int) -> MedicalDashboard:
        """
        Get aggregated dashboard for a specific hospital.
        
        Args:
            hospital_id: Hospital ID from request context
        
        Returns:
            MedicalDashboard with ward status and emergency flags
        """
        # Get hospital
        hospital = await self._get_hospital(hospital_id)
        
        # Get ward statuses
        wards = await self._get_ward_statuses(hospital_id)
        
        # Get active emergencies count for this hospital
        active_count_result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                EmergencyCase.hospital_id == hospital_id,
                EmergencyCase.status.in_([EmergencyStatus.CREATED, EmergencyStatus.ASSIGNED]),
            )
        )
        active_emergencies = active_count_result.scalar_one()
        
        # Check for CRITICAL or HIGH severity emergencies
        critical_high_result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                EmergencyCase.hospital_id == hospital_id,
                EmergencyCase.status.in_([EmergencyStatus.CREATED, EmergencyStatus.ASSIGNED]),
                EmergencyCase.severity.in_([EmergencySeverity.CRITICAL, EmergencySeverity.HIGH]),
            )
        )
        critical_high_count = critical_high_result.scalar_one()
        
        return MedicalDashboard(
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            wards=wards,
            active_emergencies=active_emergencies,
            emergency_flags=critical_high_count > 0,
            last_updated=datetime.utcnow(),
        )

    async def get_wards(self, hospital_id: int) -> WardsResponse:
        """
        Get ward-level breakdown for a hospital.
        
        Args:
            hospital_id: Hospital ID from request context
        
        Returns:
            WardsResponse with list of ward statuses
        """
        # Validate hospital exists
        await self._get_hospital(hospital_id)
        
        # Get ward statuses
        wards = await self._get_ward_statuses(hospital_id)
        
        return WardsResponse(
            hospital_id=hospital_id,
            wards=wards,
            last_updated=datetime.utcnow(),
        )

    async def _get_hospital(self, hospital_id: int) -> Hospital:
        """Fetch hospital by ID or raise 404."""
        result = await self._session.execute(
            select(Hospital).where(Hospital.id == hospital_id)
        )
        hospital = result.scalar_one_or_none()
        
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital {hospital_id} not found",
            )
        
        return hospital

    async def _get_ward_statuses(self, hospital_id: int) -> list[WardStatus]:
        """Get status of all wards for a hospital."""
        result = await self._session.execute(
            select(BedGroup)
            .where(BedGroup.hospital_id == hospital_id)
            .order_by(BedGroup.ward_type)
        )
        bed_groups = result.scalars().all()
        
        wards = []
        for bg in bed_groups:
            available = bg.total_capacity - bg.occupied
            wards.append(WardStatus(
                ward_type=bg.ward_type.value.upper(),
                total_capacity=bg.total_capacity,
                occupied=bg.occupied,
                available=available,
            ))
        
        return wards
