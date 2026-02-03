"""
Admin Dashboard Service

Aggregation logic for Super Admin dashboard views.
"""

from datetime import datetime, timedelta
from typing import Sequence

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType
from app.modules.emergencies.models import EmergencyCase, EmergencyStatus
from app.api.schemas.admin import (
    SystemOverview,
    HospitalPerformance,
    HospitalPerformanceList,
)


class AdminDashboardService:
    """Service for Super Admin dashboard aggregations."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_system_overview(self) -> SystemOverview:
        """Get aggregated system-wide overview."""
        
        # Hospital counts
        total_hospitals = await self._count_hospitals()
        active_hospitals = await self._count_hospitals(active_only=True)

        # Bed capacity by ward type
        icu_stats = await self._get_ward_stats(WardType.ICU)
        hdu_stats = await self._get_ward_stats(WardType.HDU)
        general_stats = await self._get_ward_stats(WardType.GENERAL)

        # Emergency counts
        active_emergencies = await self._count_emergencies(EmergencyStatus.CREATED)
        assigned_emergencies = await self._count_emergencies(EmergencyStatus.ASSIGNED)
        resolved_today = await self._count_emergencies_resolved_today()

        # Waste alerts (from simulation - count hospitals with high waste)
        waste_alert_count = await self._count_waste_alerts()

        return SystemOverview(
            total_hospitals=total_hospitals,
            active_hospitals=active_hospitals,
            total_icu_capacity=icu_stats["capacity"],
            total_icu_available=icu_stats["available"],
            total_hdu_capacity=hdu_stats["capacity"],
            total_hdu_available=hdu_stats["available"],
            total_general_capacity=general_stats["capacity"],
            total_general_available=general_stats["available"],
            active_emergencies=active_emergencies,
            assigned_emergencies=assigned_emergencies,
            resolved_emergencies_today=resolved_today,
            waste_alert_count=waste_alert_count,
        )

    async def get_hospital_performance(self) -> HospitalPerformanceList:
        """Get performance metrics for all hospitals."""
        
        # Get all hospitals with their bed groups
        result = await self._session.execute(
            select(Hospital).order_by(Hospital.name)
        )
        hospitals = result.scalars().all()

        performance_list = []
        for hospital in hospitals:
            perf = await self._calculate_hospital_performance(hospital)
            performance_list.append(perf)

        return HospitalPerformanceList(
            items=performance_list,
            total=len(performance_list),
        )

    async def _count_hospitals(self, active_only: bool = False) -> int:
        """Count hospitals."""
        query = select(func.count(Hospital.id))
        if active_only:
            query = query.where(Hospital.status == HospitalStatus.ACTIVE)
        result = await self._session.execute(query)
        return result.scalar_one()

    async def _get_ward_stats(self, ward_type: WardType) -> dict:
        """Get aggregated stats for a ward type."""
        result = await self._session.execute(
            select(
                func.coalesce(func.sum(BedGroup.total_capacity), 0).label("capacity"),
                func.coalesce(func.sum(BedGroup.occupied), 0).label("occupied"),
            ).where(BedGroup.ward_type == ward_type)
        )
        row = result.one()
        capacity = int(row.capacity)
        occupied = int(row.occupied)
        return {
            "capacity": capacity,
            "occupied": occupied,
            "available": capacity - occupied,
        }

    async def _count_emergencies(self, status: EmergencyStatus) -> int:
        """Count emergencies by status."""
        result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                EmergencyCase.status == status
            )
        )
        return result.scalar_one()

    async def _count_emergencies_resolved_today(self) -> int:
        """Count emergencies resolved today."""
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                and_(
                    EmergencyCase.status == EmergencyStatus.RESOLVED,
                    EmergencyCase.resolved_at >= today_start,
                )
            )
        )
        return result.scalar_one()

    async def _count_waste_alerts(self) -> int:
        """
        Count hospitals with waste alerts.
        
        Note: Waste data is event-based, not persisted yet.
        This returns a placeholder based on high-occupancy hospitals.
        """
        # Hospitals with >80% ICU occupancy are likely to have waste alerts
        result = await self._session.execute(
            select(func.count(func.distinct(BedGroup.hospital_id))).where(
                and_(
                    BedGroup.ward_type == WardType.ICU,
                    BedGroup.total_capacity > 0,
                    BedGroup.occupied * 100 / BedGroup.total_capacity >= 80,
                )
            )
        )
        return result.scalar_one()

    async def _calculate_hospital_performance(
        self, hospital: Hospital
    ) -> HospitalPerformance:
        """Calculate performance metrics for a hospital."""
        
        # Get bed groups for this hospital
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital.id)
        )
        bed_groups = result.scalars().all()

        total_capacity = 0
        total_occupied = 0
        icu_capacity = 0
        icu_available = 0

        for bg in bed_groups:
            total_capacity += bg.total_capacity
            total_occupied += bg.occupied
            if bg.ward_type == WardType.ICU:
                icu_capacity = bg.total_capacity
                icu_available = bg.total_capacity - bg.occupied

        occupancy_pct = 0.0
        if total_capacity > 0:
            occupancy_pct = round((total_occupied / total_capacity) * 100, 1)

        # Count active emergencies for this hospital
        emerg_result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                and_(
                    EmergencyCase.hospital_id == hospital.id,
                    EmergencyCase.status == EmergencyStatus.ASSIGNED,
                )
            )
        )
        active_emergencies = emerg_result.scalar_one()

        return HospitalPerformance(
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            city=hospital.city,
            status=hospital.status.value,
            total_capacity=total_capacity,
            total_occupied=total_occupied,
            occupancy_percentage=occupancy_pct,
            icu_available=icu_available,
            icu_capacity=icu_capacity,
            active_emergencies_count=active_emergencies,
        )
