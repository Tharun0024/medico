"""
Emergency Services Dashboard Service

Aggregates data for Emergency Services team dashboard.
Read-only, cross-hospital visibility.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType
from app.modules.emergencies.models import EmergencyCase, EmergencyStatus, EmergencySeverity
from app.api.schemas.emergency_dashboard import (
    EmergencyDashboard,
    HospitalBedAvailability,
    BedAvailabilityResponse,
    SuggestedHospital,
    HospitalSuggestionsResponse,
)


class EmergencyDashboardService:
    """
    Service for Emergency Services dashboard data aggregation.
    
    Provides read-only, cross-hospital visibility for emergency coordinators.
    """
    
    # Mapping severity to preferred ward types (reused from orchestrator)
    SEVERITY_WARD_MAPPING = {
        EmergencySeverity.CRITICAL: [WardType.ICU],
        EmergencySeverity.HIGH: [WardType.ICU, WardType.HDU],
        EmergencySeverity.NORMAL: [WardType.HDU, WardType.GENERAL],
    }

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_dashboard(self) -> EmergencyDashboard:
        """
        Get aggregated dashboard metrics.
        
        Returns:
            EmergencyDashboard with system-wide emergency and ICU stats
        """
        # Total active hospitals
        total_hospitals_result = await self._session.execute(
            select(func.count(Hospital.id)).where(Hospital.status == HospitalStatus.ACTIVE)
        )
        total_hospitals = total_hospitals_result.scalar_one()
        
        # Hospitals with ICU available (at least 1 bed)
        icu_available_query = (
            select(func.count(func.distinct(BedGroup.hospital_id)))
            .join(Hospital, Hospital.id == BedGroup.hospital_id)
            .where(
                Hospital.status == HospitalStatus.ACTIVE,
                BedGroup.ward_type == WardType.ICU,
                BedGroup.occupied < BedGroup.total_capacity,
            )
        )
        hospitals_with_icu_result = await self._session.execute(icu_available_query)
        hospitals_with_icu_available = hospitals_with_icu_result.scalar_one()
        
        # Total ICU beds available
        total_icu_query = (
            select(func.sum(BedGroup.total_capacity - BedGroup.occupied))
            .join(Hospital, Hospital.id == BedGroup.hospital_id)
            .where(
                Hospital.status == HospitalStatus.ACTIVE,
                BedGroup.ward_type == WardType.ICU,
            )
        )
        total_icu_result = await self._session.execute(total_icu_query)
        total_icu_available = total_icu_result.scalar_one() or 0
        
        # Active emergencies (CREATED or ASSIGNED)
        active_emergencies_result = await self._session.execute(
            select(func.count(EmergencyCase.id)).where(
                EmergencyCase.status.in_([EmergencyStatus.CREATED, EmergencyStatus.ASSIGNED])
            )
        )
        active_emergencies = active_emergencies_result.scalar_one()
        
        return EmergencyDashboard(
            total_hospitals=total_hospitals,
            hospitals_with_icu_available=hospitals_with_icu_available,
            total_icu_available=total_icu_available,
            active_emergencies=active_emergencies,
            last_updated=datetime.utcnow(),
        )

    async def get_bed_availability(self) -> BedAvailabilityResponse:
        """
        Get bed availability breakdown per hospital.
        
        Returns:
            List of hospitals with ICU/HDU/GENERAL availability
        """
        # Get all active hospitals with their bed groups
        query = (
            select(Hospital, BedGroup)
            .outerjoin(BedGroup, Hospital.id == BedGroup.hospital_id)
            .where(Hospital.status == HospitalStatus.ACTIVE)
            .order_by(Hospital.name)
        )
        result = await self._session.execute(query)
        rows = result.all()
        
        # Aggregate by hospital
        hospital_map: dict[int, HospitalBedAvailability] = {}
        
        for hospital, bed_group in rows:
            if hospital.id not in hospital_map:
                hospital_map[hospital.id] = HospitalBedAvailability(
                    hospital_id=hospital.id,
                    hospital_name=hospital.name,
                    ICU_available=0,
                    HDU_available=0,
                    GENERAL_available=0,
                )
            
            if bed_group:
                availability = hospital_map[hospital.id]
                available = bed_group.total_capacity - bed_group.occupied
                
                if bed_group.ward_type == WardType.ICU:
                    availability.ICU_available = available
                elif bed_group.ward_type == WardType.HDU:
                    availability.HDU_available = available
                elif bed_group.ward_type == WardType.GENERAL:
                    availability.GENERAL_available = available
        
        return BedAvailabilityResponse(
            hospitals=list(hospital_map.values()),
            last_updated=datetime.utcnow(),
        )

    async def suggest_hospitals(self, severity: str) -> HospitalSuggestionsResponse:
        """
        Get ranked hospital suggestions for a given severity.
        
        Uses the same ward mapping logic as the orchestrator:
        - CRITICAL: ICU only
        - HIGH: ICU preferred, then HDU
        - NORMAL: HDU preferred, then GENERAL
        
        Scoring:
        - Base score from available beds (more = better)
        - Bonus for primary ward availability
        - Penalty for high occupancy
        
        Args:
            severity: CRITICAL, HIGH, or NORMAL
        
        Returns:
            Ranked list of hospital suggestions
        """
        try:
            severity_enum = EmergencySeverity(severity.lower())
        except ValueError:
            severity_enum = EmergencySeverity.NORMAL
        
        preferred_wards = self.SEVERITY_WARD_MAPPING[severity_enum]
        
        # Get all active hospitals with bed data
        query = (
            select(Hospital, BedGroup)
            .outerjoin(BedGroup, Hospital.id == BedGroup.hospital_id)
            .where(Hospital.status == HospitalStatus.ACTIVE)
        )
        result = await self._session.execute(query)
        rows = result.all()
        
        # Build hospital data
        hospital_data: dict[int, dict] = {}
        
        for hospital, bed_group in rows:
            if hospital.id not in hospital_data:
                hospital_data[hospital.id] = {
                    "id": hospital.id,
                    "name": hospital.name,
                    "wards": {},
                }
            
            if bed_group:
                available = bed_group.total_capacity - bed_group.occupied
                occupancy_rate = (bed_group.occupied / bed_group.total_capacity * 100) if bed_group.total_capacity > 0 else 100
                
                hospital_data[hospital.id]["wards"][bed_group.ward_type] = {
                    "available": available,
                    "occupancy_rate": occupancy_rate,
                }
        
        # Calculate suitability scores
        suggestions = []
        
        for hospital_id, data in hospital_data.items():
            available_wards = []
            score = 0.0
            
            # Check preferred wards
            for i, ward_type in enumerate(preferred_wards):
                ward_info = data["wards"].get(ward_type)
                if ward_info and ward_info["available"] > 0:
                    available_wards.append(ward_type.value.upper())
                    
                    # Score components:
                    # - Primary ward bonus: 50 points for first preferred ward, 30 for second
                    ward_priority_bonus = 50 if i == 0 else 30
                    
                    # - Available beds contribution (max 30 points)
                    beds_score = min(ward_info["available"] * 5, 30)
                    
                    # - Low occupancy bonus (max 20 points)
                    occupancy_bonus = max(0, (100 - ward_info["occupancy_rate"]) * 0.2)
                    
                    score += ward_priority_bonus + beds_score + occupancy_bonus
            
            # Also check other wards for fallback
            for ward_type in WardType:
                if ward_type not in preferred_wards:
                    ward_info = data["wards"].get(ward_type)
                    if ward_info and ward_info["available"] > 0:
                        available_wards.append(ward_type.value.upper())
                        # Smaller score contribution for non-preferred wards
                        score += min(ward_info["available"], 5)
            
            # Only include hospitals with at least one available ward
            if available_wards:
                suggestions.append(SuggestedHospital(
                    hospital_id=hospital_id,
                    hospital_name=data["name"],
                    suitability_score=min(score, 100),  # Cap at 100
                    available_wards=available_wards,
                ))
        
        # Sort by suitability score (descending)
        suggestions.sort(key=lambda s: s.suitability_score, reverse=True)
        
        return HospitalSuggestionsResponse(
            severity=severity_enum.value.upper(),
            suggestions=suggestions,
            last_updated=datetime.utcnow(),
        )
