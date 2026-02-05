"""
Hospital Admin Service

Business logic for Hospital Admin Phase-2 operations:
- Ward capacity management
- Waste prediction
- Pickup request creation
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType
from app.notifications.schemas import NotificationCreate
from app.notifications.service import NotificationService
from app.notifications.models import NotificationSeverity
from app.core.event_bus import emit_event, EventType
from app.core.rbac import RequestContext, UserRole
from app.api.hospital_admin.schemas import (
    WardStatus,
    WardStatusResponse,
    WardCapacityUpdateRequest,
    WardCapacityStatus,
    WardCapacityUpdateResponse,
    WastePrediction,
    WastePredictionByWard,
    WasteComparison,
    PickupRequestCreate,
    PickupRequestResponse,
)

# Import waste tracking from waste dashboard service
from app.api.services.waste_dashboard_service import (
    _waste_levels,
    _waste_tasks,
    _get_alert_level,
    WARNING_THRESHOLD_KG,
    CRITICAL_THRESHOLD_KG,
    TaskStatus,
)


logger = logging.getLogger("medico.hospital_admin")


# Waste generation rates per bed per day (kg) - rule-based prediction
WASTE_RATE_BY_WARD = {
    WardType.ICU: 8.0,      # High waste - critical care
    WardType.HDU: 5.0,      # Medium-high waste
    WardType.GENERAL: 2.5,  # Standard waste
}

# In-memory pickup request store
_pickup_requests: dict[str, dict] = {}


class HospitalAdminService:
    """
    Service for Hospital Admin Phase-2 operations.
    
    Provides ward capacity management, waste prediction, and pickup requests.
    All operations are hospital-scoped.
    """
    
    def __init__(self, session: AsyncSession):
        self._session = session
        self._notification_service = NotificationService(session)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Ward Capacity Management
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_wards(
        self,
        hospital_id: int,
    ) -> WardStatusResponse:
        """
        Get read-only ward status for a hospital.
        
        Args:
            hospital_id: Hospital to query
        
        Returns:
            WardStatusResponse with current capacity and occupancy
        """
        hospital = await self._get_hospital(hospital_id)
        
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital_id)
        )
        bed_groups = list(result.scalars().all())
        
        wards = []
        total_capacity = 0
        total_occupied = 0
        
        for bg in bed_groups:
            available = bg.total_capacity - bg.occupied
            occupancy_pct = (bg.occupied / bg.total_capacity * 100) if bg.total_capacity > 0 else 0.0
            
            wards.append(WardStatus(
                ward_type=bg.ward_type.value,
                bed_group_id=bg.id,
                total_capacity=bg.total_capacity,
                occupied=bg.occupied,
                available=available,
                occupancy_percentage=round(occupancy_pct, 1),
            ))
            
            total_capacity += bg.total_capacity
            total_occupied += bg.occupied
        
        total_available = total_capacity - total_occupied
        overall_pct = (total_occupied / total_capacity * 100) if total_capacity > 0 else 0.0
        
        return WardStatusResponse(
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            wards=wards,
            total_capacity=total_capacity,
            total_occupied=total_occupied,
            total_available=total_available,
            overall_occupancy_percentage=round(overall_pct, 1),
            retrieved_at=datetime.utcnow(),
        )
    
    async def update_ward_capacity(
        self,
        hospital_id: int,
        request: WardCapacityUpdateRequest,
        actor: RequestContext,
    ) -> WardCapacityUpdateResponse:
        """
        Update ward capacities for a hospital.
        
        Args:
            hospital_id: Hospital to update
            request: Capacity update request with ward updates
            actor: Request context of the hospital admin
        
        Returns:
            WardCapacityUpdateResponse with updated ward statuses
            
        Raises:
            HTTPException: If hospital not found or capacity reduction violates occupancy
        """
        # Validate hospital
        hospital = await self._get_hospital(hospital_id)
        
        # Fetch all bed groups for this hospital
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital_id)
        )
        bed_groups = {bg.ward_type: bg for bg in result.scalars().all()}
        
        updated_wards = []
        
        for ward_update in request.wards:
            bed_group = bed_groups.get(ward_update.ward_type)
            
            if not bed_group:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Ward type {ward_update.ward_type.value} not found for hospital {hospital.name}",
                )
            
            # Validate capacity reduction
            if ward_update.new_capacity < bed_group.occupied:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Cannot reduce {ward_update.ward_type.value.upper()} capacity to {ward_update.new_capacity}. "
                        f"Current occupancy is {bed_group.occupied}."
                    ),
                )
            
            # Store previous capacity for response
            previous_capacity = bed_group.total_capacity
            
            # Update capacity
            bed_group.total_capacity = ward_update.new_capacity
            bed_group.updated_at = datetime.utcnow()
            
            available = bed_group.total_capacity - bed_group.occupied
            occupancy_pct = (bed_group.occupied / bed_group.total_capacity * 100) if bed_group.total_capacity > 0 else 0.0
            
            updated_wards.append(WardCapacityStatus(
                ward_type=ward_update.ward_type.value,
                bed_group_id=bed_group.id,
                previous_capacity=previous_capacity,
                new_capacity=bed_group.total_capacity,
                occupied=bed_group.occupied,
                available=available,
                occupancy_percentage=round(occupancy_pct, 1),
            ))
        
        await self._session.commit()
        
        # Emit events for each updated ward
        for ward_status in updated_wards:
            emit_event(EventType.HOSPITAL_CAPACITY_UPDATED, {
                "hospital_id": hospital_id,
                "hospital_name": hospital.name,
                "ward_type": ward_status.ward_type,
                "previous_capacity": ward_status.previous_capacity,
                "new_capacity": ward_status.new_capacity,
                "occupied": ward_status.occupied,
                "reason": request.reason,
                "updated_by": actor.role.value,
            })
        
        logger.info(
            f"Hospital {hospital_id} ward capacity updated by {actor.role.value}: "
            f"{[w.ward_type for w in updated_wards]}"
        )
        
        return WardCapacityUpdateResponse(
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            updated_wards=updated_wards,
            message=f"Successfully updated {len(updated_wards)} ward(s)",
            updated_at=datetime.utcnow(),
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Waste Prediction
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_waste_prediction(
        self,
        hospital_id: int,
    ) -> WastePrediction:
        """
        Get waste prediction for a hospital based on current occupancy and ward types.
        
        Uses rule-based calculation:
        - ICU beds generate ~8 kg/day
        - HDU beds generate ~5 kg/day
        - General beds generate ~2.5 kg/day
        
        Args:
            hospital_id: Hospital to predict for
        
        Returns:
            WastePrediction with daily/weekly predictions and recommendations
        """
        # Validate hospital
        hospital = await self._get_hospital(hospital_id)
        
        # Fetch all bed groups
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital_id)
        )
        bed_groups = list(result.scalars().all())
        
        # Get current waste level
        current_waste = _waste_levels.get(hospital_id, 0.0)
        alert_level = _get_alert_level(current_waste)
        
        # Calculate predictions per ward
        by_ward = []
        total_occupied = 0
        total_daily_prediction = 0.0
        
        for bg in bed_groups:
            rate = WASTE_RATE_BY_WARD.get(bg.ward_type, 2.5)
            daily_prediction = bg.occupied * rate
            
            by_ward.append(WastePredictionByWard(
                ward_type=bg.ward_type.value,
                occupied_beds=bg.occupied,
                waste_rate_kg_per_day=rate,
                predicted_daily_kg=round(daily_prediction, 1),
            ))
            
            total_occupied += bg.occupied
            total_daily_prediction += daily_prediction
        
        # Calculate days to thresholds
        days_to_warning = None
        days_to_critical = None
        
        if total_daily_prediction > 0:
            remaining_to_warning = WARNING_THRESHOLD_KG - current_waste
            remaining_to_critical = CRITICAL_THRESHOLD_KG - current_waste
            
            if remaining_to_warning > 0:
                days_to_warning = round(remaining_to_warning / total_daily_prediction, 1)
            
            if remaining_to_critical > 0:
                days_to_critical = round(remaining_to_critical / total_daily_prediction, 1)
        
        # Generate recommendation
        collection_recommended = current_waste >= WARNING_THRESHOLD_KG
        if alert_level.value == "critical":
            recommendation = "CRITICAL: Immediate waste collection required."
        elif alert_level.value == "warning":
            recommendation = "WARNING: Schedule waste collection soon."
        elif days_to_warning and days_to_warning < 2:
            recommendation = f"Approaching warning threshold in ~{days_to_warning} days. Consider scheduling collection."
            collection_recommended = True
        else:
            recommendation = "Waste levels normal. No immediate action required."
        
        return WastePrediction(
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            current_waste_kg=round(current_waste, 1),
            alert_level=alert_level.value,
            total_occupied_beds=total_occupied,
            predicted_daily_kg=round(total_daily_prediction, 1),
            predicted_weekly_kg=round(total_daily_prediction * 7, 1),
            by_ward=by_ward,
            warning_threshold_kg=WARNING_THRESHOLD_KG,
            critical_threshold_kg=CRITICAL_THRESHOLD_KG,
            estimated_days_to_warning=days_to_warning,
            estimated_days_to_critical=days_to_critical,
            collection_recommended=collection_recommended,
            recommendation=recommendation,
            predicted_at=datetime.utcnow(),
        )
    
    async def compare_waste(
        self,
        hospital_id: int,
        period_days: int = 7,
    ) -> WasteComparison:
        """
        Compare actual vs predicted waste for assessment.
        
        Note: This is a simplified comparison since we don't have historical data.
        In production, this would query historical waste collection records.
        
        Args:
            hospital_id: Hospital to compare
            period_days: Period for comparison (default 7 days)
        
        Returns:
            WasteComparison with variance assessment
        """
        # Get hospital and prediction
        hospital = await self._get_hospital(hospital_id)
        prediction = await self.get_waste_prediction(hospital_id)
        
        # Current actual waste (accumulated since last collection)
        actual_waste = _waste_levels.get(hospital_id, 0.0)
        
        # For comparison, we use daily prediction * simulated days
        # In reality, this would query historical collection data
        simulated_days = min(period_days, 7)  # Cap at 7 days for simulation
        predicted_waste = prediction.predicted_daily_kg * simulated_days
        
        # Calculate variance
        variance_kg = actual_waste - predicted_waste
        variance_pct = (variance_kg / predicted_waste * 100) if predicted_waste > 0 else 0.0
        
        # Assess variance
        if abs(variance_pct) <= 15:
            assessment = "on_track"
        elif variance_pct > 15:
            assessment = "above_predicted"
        else:
            assessment = "below_predicted"
        
        return WasteComparison(
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            period_days=simulated_days,
            actual_waste_kg=round(actual_waste, 1),
            predicted_waste_kg=round(predicted_waste, 1),
            variance_kg=round(variance_kg, 1),
            variance_percentage=round(variance_pct, 1),
            assessment=assessment,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Waste Pickup Request
    # ─────────────────────────────────────────────────────────────────────────
    
    async def request_pickup(
        self,
        hospital_id: int,
        request: PickupRequestCreate,
        actor: RequestContext,
    ) -> PickupRequestResponse:
        """
        Create a waste pickup request.
        
        Args:
            hospital_id: Hospital requesting pickup
            request: Pickup request details
            actor: Request context of the hospital admin
        
        Returns:
            PickupRequestResponse with request details
        """
        # Validate hospital
        hospital = await self._get_hospital(hospital_id)
        
        # Get current waste level
        current_waste = _waste_levels.get(hospital_id, 0.0)
        
        # Check for existing pending request
        for req_id, req in _pickup_requests.items():
            if req["hospital_id"] == hospital_id and req["status"] == "pending":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A pickup request is already pending for this hospital (ID: {req_id})",
                )
        
        # Create pickup request
        request_id = f"PR-{hospital_id}-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()
        
        _pickup_requests[request_id] = {
            "request_id": request_id,
            "hospital_id": hospital_id,
            "hospital_name": hospital.name,
            "current_waste_kg": current_waste,
            "urgency": request.urgency,
            "notes": request.notes,
            "status": "pending",
            "requested_at": now,
            "requested_by": actor.role.value,
        }
        
        # Emit event
        emit_event(EventType.WASTE_PICKUP_REQUESTED, {
            "request_id": request_id,
            "hospital_id": hospital_id,
            "hospital_name": hospital.name,
            "current_waste_kg": current_waste,
            "urgency": request.urgency,
            "requested_by": actor.role.value,
        })
        
        # Notify waste team
        severity_map = {
            "normal": NotificationSeverity.INFO,
            "urgent": NotificationSeverity.WARNING,
            "critical": NotificationSeverity.CRITICAL,
        }
        
        notification = NotificationCreate(
            recipient_role=UserRole.WASTE_TEAM.value,
            recipient_scope=None,  # Broadcast to all waste team members
            title=f"Pickup Request: {hospital.name}",
            message=(
                f"Waste pickup requested by {hospital.name}. "
                f"Current waste: {current_waste:.1f} kg. "
                f"Urgency: {request.urgency.upper()}. "
                f"{request.notes or ''}"
            ),
            severity=severity_map.get(request.urgency, NotificationSeverity.INFO),
        )
        
        await self._notification_service.create_notification(notification, actor)
        
        logger.info(
            f"Pickup request {request_id} created for hospital {hospital_id} "
            f"(urgency={request.urgency}, waste={current_waste:.1f}kg)"
        )
        
        return PickupRequestResponse(
            request_id=request_id,
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            current_waste_kg=round(current_waste, 1),
            urgency=request.urgency,
            status="pending",
            requested_at=now,
            message=f"Pickup request submitted. Waste team has been notified.",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private Helpers
    # ─────────────────────────────────────────────────────────────────────────
    
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
