"""
Control Room Service

Business logic for control room operations: manual assignment, reassignment, and metrics.
"""

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.emergencies.models import EmergencyCase, EmergencySeverity, EmergencyStatus
from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType
from app.notifications.models import NotificationSeverity
from app.notifications.schemas import NotificationCreate
from app.notifications.service import NotificationService
from app.core.event_bus import emit_event, EventType
from app.core.rbac import RequestContext, UserRole
from app.api.control_room.schemas import (
    ManualAssignRequest,
    ReassignRequest,
    AssignmentResponse,
    ControlRoomMetrics,
    SeverityMetrics,
    HospitalLoadMetric,
    HospitalLoadList,
)


logger = logging.getLogger("medico.control_room")


class ControlRoomService:
    """
    Service for control room operations.
    
    Provides manual emergency assignment, reassignment, and metrics.
    All operations emit events and create notifications.
    """
    
    def __init__(self, session: AsyncSession):
        self._session = session
        self._notification_service = NotificationService(session)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Manual Assignment
    # ─────────────────────────────────────────────────────────────────────────
    
    async def assign_emergency_to_hospital(
        self,
        emergency_id: int,
        request: ManualAssignRequest,
        actor: RequestContext,
    ) -> AssignmentResponse:
        """
        Manually assign an emergency to a specific hospital.
        
        Args:
            emergency_id: ID of the emergency to assign
            request: Assignment details (hospital_id, bed_group_id, reason)
            actor: Request context of the control room operator
        
        Returns:
            AssignmentResponse with details
            
        Raises:
            HTTPException: If emergency not found, already assigned, or bed unavailable
        """
        # Fetch emergency
        emergency = await self._get_emergency(emergency_id)
        
        # Validate emergency status
        if emergency.status == EmergencyStatus.ASSIGNED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Emergency {emergency_id} is already assigned. Use reassign endpoint instead.",
            )
        if emergency.status == EmergencyStatus.RESOLVED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Emergency {emergency_id} is already resolved.",
            )
        if emergency.status == EmergencyStatus.FAILED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Emergency {emergency_id} has failed status. Create a new emergency.",
            )
        
        # Validate hospital and bed
        hospital, bed_group = await self._validate_hospital_bed(
            request.hospital_id, 
            request.bed_group_id
        )
        
        # Reserve the bed
        await self._reserve_bed(bed_group)
        
        # Update emergency
        emergency.status = EmergencyStatus.ASSIGNED
        emergency.hospital_id = hospital.id
        emergency.bed_group_id = bed_group.id
        emergency.assigned_at = datetime.utcnow()
        
        await self._session.commit()
        await self._session.refresh(emergency)
        
        # Emit events
        emit_event(EventType.BED_RESERVED, {
            "bed_group_id": bed_group.id,
            "hospital_id": hospital.id,
            "ward_type": bed_group.ward_type.value,
            "emergency_id": emergency_id,
        })
        
        emit_event(EventType.EMERGENCY_MANUALLY_ASSIGNED, {
            "emergency_id": emergency_id,
            "hospital_id": hospital.id,
            "bed_group_id": bed_group.id,
            "severity": emergency.severity.value,
            "reason": request.reason,
            "operator_role": actor.role.value,
        })
        
        emit_event(EventType.HOSPITAL_NOTIFIED_INCOMING, {
            "hospital_id": hospital.id,
            "emergency_id": emergency_id,
            "severity": emergency.severity.value,
            "ward_type": bed_group.ward_type.value,
        })
        
        # Create notification for hospital admin
        await self._notify_hospital_admin(
            hospital_id=hospital.id,
            emergency_id=emergency_id,
            severity=emergency.severity,
            ward_type=bed_group.ward_type,
            action="assigned",
            actor=actor,
        )
        
        logger.info(
            f"Emergency {emergency_id} manually assigned to hospital {hospital.id} "
            f"(bed_group={bed_group.id}) by {actor.role.value}"
        )
        
        return AssignmentResponse(
            emergency_id=emergency_id,
            status=EmergencyStatus.ASSIGNED,
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            bed_group_id=bed_group.id,
            ward_type=bed_group.ward_type.value,
            message=f"Emergency manually assigned to {hospital.name} ({bed_group.ward_type.value.upper()})",
            assigned_at=emergency.assigned_at,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Reassignment
    # ─────────────────────────────────────────────────────────────────────────
    
    async def reassign_emergency(
        self,
        emergency_id: int,
        request: ReassignRequest,
        actor: RequestContext,
    ) -> AssignmentResponse:
        """
        Reassign an emergency from one hospital to another.
        
        Releases the bed at the original hospital and reserves at the new one.
        
        Args:
            emergency_id: ID of the emergency to reassign
            request: Reassignment details (new_hospital_id, new_bed_group_id, reason)
            actor: Request context of the control room operator
        
        Returns:
            AssignmentResponse with details including previous hospital
            
        Raises:
            HTTPException: If emergency not assigned, or new bed unavailable
        """
        # Fetch emergency
        emergency = await self._get_emergency(emergency_id)
        
        # Validate emergency status - must be currently assigned
        if emergency.status != EmergencyStatus.ASSIGNED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Emergency {emergency_id} is not assigned. Use assign endpoint instead.",
            )
        
        # Get previous hospital info
        prev_hospital_id = emergency.hospital_id
        prev_bed_group_id = emergency.bed_group_id
        prev_hospital = await self._get_hospital(prev_hospital_id)
        
        # Cannot reassign to same hospital/bed
        if request.new_hospital_id == prev_hospital_id and request.new_bed_group_id == prev_bed_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reassign to the same hospital and bed group.",
            )
        
        # Validate new hospital and bed
        new_hospital, new_bed_group = await self._validate_hospital_bed(
            request.new_hospital_id,
            request.new_bed_group_id
        )
        
        # Release old bed
        if prev_bed_group_id:
            await self._release_bed(prev_bed_group_id)
        
        # Reserve new bed
        await self._reserve_bed(new_bed_group)
        
        # Update emergency
        emergency.hospital_id = new_hospital.id
        emergency.bed_group_id = new_bed_group.id
        # Keep the original assigned_at, or update to now
        emergency.assigned_at = datetime.utcnow()
        
        await self._session.commit()
        await self._session.refresh(emergency)
        
        # Emit events
        emit_event(EventType.BED_RELEASED, {
            "bed_group_id": prev_bed_group_id,
            "hospital_id": prev_hospital_id,
            "emergency_id": emergency_id,
        })
        
        emit_event(EventType.BED_RESERVED, {
            "bed_group_id": new_bed_group.id,
            "hospital_id": new_hospital.id,
            "ward_type": new_bed_group.ward_type.value,
            "emergency_id": emergency_id,
        })
        
        emit_event(EventType.EMERGENCY_REASSIGNED, {
            "emergency_id": emergency_id,
            "previous_hospital_id": prev_hospital_id,
            "new_hospital_id": new_hospital.id,
            "new_bed_group_id": new_bed_group.id,
            "severity": emergency.severity.value,
            "reason": request.reason,
            "operator_role": actor.role.value,
        })
        
        emit_event(EventType.HOSPITAL_NOTIFIED_INCOMING, {
            "hospital_id": new_hospital.id,
            "emergency_id": emergency_id,
            "severity": emergency.severity.value,
            "ward_type": new_bed_group.ward_type.value,
            "reassigned_from": prev_hospital.name,
        })
        
        # Notify both hospitals
        await self._notify_hospital_admin(
            hospital_id=prev_hospital_id,
            emergency_id=emergency_id,
            severity=emergency.severity,
            ward_type=new_bed_group.ward_type,
            action="reassigned_away",
            actor=actor,
            extra_context=f"Reassigned to {new_hospital.name}. Reason: {request.reason}",
        )
        
        await self._notify_hospital_admin(
            hospital_id=new_hospital.id,
            emergency_id=emergency_id,
            severity=emergency.severity,
            ward_type=new_bed_group.ward_type,
            action="reassigned_to",
            actor=actor,
            extra_context=f"Reassigned from {prev_hospital.name}. Reason: {request.reason}",
        )
        
        logger.info(
            f"Emergency {emergency_id} reassigned from hospital {prev_hospital_id} to {new_hospital.id} "
            f"by {actor.role.value}. Reason: {request.reason}"
        )
        
        return AssignmentResponse(
            emergency_id=emergency_id,
            status=EmergencyStatus.ASSIGNED,
            hospital_id=new_hospital.id,
            hospital_name=new_hospital.name,
            bed_group_id=new_bed_group.id,
            ward_type=new_bed_group.ward_type.value,
            previous_hospital_id=prev_hospital_id,
            previous_hospital_name=prev_hospital.name,
            message=f"Emergency reassigned from {prev_hospital.name} to {new_hospital.name} ({new_bed_group.ward_type.value.upper()})",
            assigned_at=emergency.assigned_at,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Metrics
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_metrics(
        self,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> ControlRoomMetrics:
        """
        Get control room metrics for emergency response and resolution.
        
        Args:
            from_date: Start of metrics period (optional)
            to_date: End of metrics period (optional)
        
        Returns:
            ControlRoomMetrics with counts and averages
        """
        # Build base query
        query = select(EmergencyCase)
        
        if from_date:
            query = query.where(EmergencyCase.created_at >= from_date)
        if to_date:
            query = query.where(EmergencyCase.created_at <= to_date)
        
        result = await self._session.execute(query)
        emergencies = result.scalars().all()
        
        # Calculate metrics
        metrics = ControlRoomMetrics(
            metrics_from=from_date,
            metrics_to=to_date,
        )
        
        metrics.total_emergencies = len(emergencies)
        
        response_times = []
        resolution_times = []
        severity_data = {s: SeverityMetrics(severity=s) for s in EmergencySeverity}
        
        for e in emergencies:
            # Count by status
            if e.status == EmergencyStatus.CREATED:
                metrics.total_pending += 1
            elif e.status == EmergencyStatus.ASSIGNED:
                metrics.total_assigned += 1
            elif e.status == EmergencyStatus.RESOLVED:
                metrics.total_resolved += 1
            elif e.status == EmergencyStatus.FAILED:
                metrics.total_failed += 1
            
            # Severity breakdown
            sev = severity_data[e.severity]
            sev.total_count += 1
            if e.status == EmergencyStatus.CREATED:
                sev.pending_count += 1
            elif e.status == EmergencyStatus.ASSIGNED:
                sev.assigned_count += 1
            elif e.status == EmergencyStatus.RESOLVED:
                sev.resolved_count += 1
            elif e.status == EmergencyStatus.FAILED:
                sev.failed_count += 1
            
            # Response time (created → assigned)
            if e.assigned_at and e.created_at:
                response_time = (e.assigned_at - e.created_at).total_seconds()
                response_times.append(response_time)
            
            # Resolution time (created → resolved)
            if e.resolved_at and e.created_at:
                resolution_time = (e.resolved_at - e.created_at).total_seconds()
                resolution_times.append(resolution_time)
        
        # Calculate averages
        if response_times:
            metrics.avg_response_seconds = sum(response_times) / len(response_times)
        if resolution_times:
            metrics.avg_resolution_seconds = sum(resolution_times) / len(resolution_times)
        
        # Calculate per-severity averages
        for e in emergencies:
            sev = severity_data[e.severity]
            if e.assigned_at and e.created_at:
                rt = (e.assigned_at - e.created_at).total_seconds()
                if sev.avg_response_seconds is None:
                    sev.avg_response_seconds = rt
                else:
                    # Simple running average (not accurate for large datasets)
                    sev.avg_response_seconds = (sev.avg_response_seconds + rt) / 2
            
            if e.resolved_at and e.created_at:
                res = (e.resolved_at - e.created_at).total_seconds()
                if sev.avg_resolution_seconds is None:
                    sev.avg_resolution_seconds = res
                else:
                    sev.avg_resolution_seconds = (sev.avg_resolution_seconds + res) / 2
        
        metrics.by_severity = list(severity_data.values())
        metrics.pending_emergencies = metrics.total_pending
        
        return metrics
    
    async def get_hospital_loads(self) -> HospitalLoadList:
        """
        Get current load metrics for all active hospitals.
        
        Returns:
            List of hospital load metrics
        """
        # Query all active hospitals with their bed groups
        query = (
            select(Hospital, BedGroup)
            .outerjoin(BedGroup, Hospital.id == BedGroup.hospital_id)
            .where(Hospital.status == HospitalStatus.ACTIVE)
        )
        
        result = await self._session.execute(query)
        rows = result.all()
        
        # Aggregate by hospital
        hospital_data = {}
        for hospital, bed_group in rows:
            if hospital.id not in hospital_data:
                hospital_data[hospital.id] = {
                    "hospital": hospital,
                    "icu_available": 0,
                    "hdu_available": 0,
                    "general_available": 0,
                    "total_beds": 0,
                    "occupied_beds": 0,
                }
            
            if bed_group:
                available = bed_group.total_capacity - bed_group.occupied
                hospital_data[hospital.id]["total_beds"] += bed_group.total_capacity
                hospital_data[hospital.id]["occupied_beds"] += bed_group.occupied
                
                if bed_group.ward_type == WardType.ICU:
                    hospital_data[hospital.id]["icu_available"] += available
                elif bed_group.ward_type == WardType.HDU:
                    hospital_data[hospital.id]["hdu_available"] += available
                elif bed_group.ward_type == WardType.GENERAL:
                    hospital_data[hospital.id]["general_available"] += available
        
        # Count active emergencies per hospital
        emergency_counts = {}
        emergency_query = (
            select(EmergencyCase.hospital_id, func.count(EmergencyCase.id))
            .where(EmergencyCase.status == EmergencyStatus.ASSIGNED)
            .group_by(EmergencyCase.hospital_id)
        )
        emergency_result = await self._session.execute(emergency_query)
        for hospital_id, count in emergency_result.all():
            emergency_counts[hospital_id] = count
        
        # Build response
        items = []
        for hospital_id, data in hospital_data.items():
            hospital = data["hospital"]
            total = data["total_beds"]
            occupied = data["occupied_beds"]
            occupancy = (occupied / total * 100) if total > 0 else 0.0
            
            items.append(HospitalLoadMetric(
                hospital_id=hospital_id,
                hospital_name=hospital.name,
                active_emergencies=emergency_counts.get(hospital_id, 0),
                available_icu_beds=data["icu_available"],
                available_hdu_beds=data["hdu_available"],
                available_general_beds=data["general_available"],
                total_occupancy_percent=round(occupancy, 1),
            ))
        
        return HospitalLoadList(items=items, total=len(items))
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private Helpers
    # ─────────────────────────────────────────────────────────────────────────
    
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
    
    async def _validate_hospital_bed(
        self,
        hospital_id: int,
        bed_group_id: int,
    ) -> tuple[Hospital, BedGroup]:
        """
        Validate that hospital is active and bed group is available.
        
        Returns:
            Tuple of (Hospital, BedGroup)
            
        Raises:
            HTTPException: If hospital inactive or bed unavailable
        """
        # Get hospital
        result = await self._session.execute(
            select(Hospital).where(Hospital.id == hospital_id)
        )
        hospital = result.scalar_one_or_none()
        
        if not hospital:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hospital {hospital_id} not found",
            )
        
        if hospital.status != HospitalStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Hospital {hospital.name} is not active (status: {hospital.status.value})",
            )
        
        # Get bed group
        result = await self._session.execute(
            select(BedGroup).where(
                BedGroup.id == bed_group_id,
                BedGroup.hospital_id == hospital_id
            )
        )
        bed_group = result.scalar_one_or_none()
        
        if not bed_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bed group {bed_group_id} not found in hospital {hospital.name}",
            )
        
        # Check availability
        if bed_group.occupied >= bed_group.total_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No beds available in {bed_group.ward_type.value.upper()} ward at {hospital.name}",
            )
        
        return hospital, bed_group
    
    async def _reserve_bed(self, bed_group: BedGroup) -> None:
        """Reserve a bed by incrementing occupied count."""
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
    
    async def _notify_hospital_admin(
        self,
        hospital_id: int,
        emergency_id: int,
        severity: EmergencySeverity,
        ward_type: WardType,
        action: str,
        actor: RequestContext,
        extra_context: Optional[str] = None,
    ) -> None:
        """
        Create a notification for hospital admin about emergency assignment.
        
        Args:
            hospital_id: Target hospital
            emergency_id: Emergency being assigned
            severity: Emergency severity
            ward_type: Ward type for the bed
            action: 'assigned', 'reassigned_to', or 'reassigned_away'
            actor: Who triggered the action
            extra_context: Additional context message
        """
        # Map action to notification content
        if action == "assigned":
            title = f"Incoming Emergency #{emergency_id}"
            message = (
                f"A {severity.value.upper()} severity emergency has been assigned to your hospital. "
                f"Prepare {ward_type.value.upper()} ward."
            )
            notif_severity = NotificationSeverity.WARNING
        elif action == "reassigned_to":
            title = f"Incoming Emergency #{emergency_id} (Reassigned)"
            message = (
                f"A {severity.value.upper()} severity emergency has been reassigned to your hospital. "
                f"Prepare {ward_type.value.upper()} ward. {extra_context or ''}"
            )
            notif_severity = NotificationSeverity.WARNING
        elif action == "reassigned_away":
            title = f"Emergency #{emergency_id} Reassigned"
            message = (
                f"The emergency has been reassigned to another hospital. "
                f"Bed in {ward_type.value.upper()} ward has been released. {extra_context or ''}"
            )
            notif_severity = NotificationSeverity.INFO
        else:
            title = f"Emergency #{emergency_id} Update"
            message = extra_context or f"Emergency status updated: {action}"
            notif_severity = NotificationSeverity.INFO
        
        # Create notification
        notification_data = NotificationCreate(
            recipient_role=UserRole.HOSPITAL_ADMIN.value,
            recipient_scope=hospital_id,
            title=title,
            message=message,
            severity=notif_severity,
        )
        
        await self._notification_service.create_notification(notification_data, actor)
