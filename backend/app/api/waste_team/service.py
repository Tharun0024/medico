"""
Waste Team Service

Business logic for Waste Team Phase-2 operations:
- View pickup requests
- Mark waste as collected
- Mark waste as disposed
- Record payment
- Maintain immutable disposal logs
"""

import logging
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.hospitals.models import Hospital
from app.modules.waste.models import (
    WasteRequest, 
    WasteRequestStatus, 
    DisposalLog, 
    DisposalMethod,
)
from app.notifications.schemas import NotificationCreate
from app.notifications.service import NotificationService
from app.notifications.models import NotificationSeverity
from app.core.event_bus import emit_event, EventType
from app.core.rbac import RequestContext, UserRole
from app.api.waste_team.schemas import (
    PickupRequestView,
    PickupRequestList,
    CollectRequest,
    CollectResponse,
    DisposeRequest,
    DisposeResponse,
    PaymentRequest,
    PaymentResponse,
    DisposalLogEntry,
    DisposalLogList,
)

# Import pickup requests from hospital admin service (shared state)
from app.api.hospital_admin.service import _pickup_requests

# Import waste level tracking
from app.api.services.waste_dashboard_service import (
    reset_waste_level,
    _waste_levels,
)


logger = logging.getLogger("medico.waste_team")


# Tolerance for disposal weight (20% over reported + collected)
DISPOSAL_WEIGHT_TOLERANCE = 0.20


class WasteTeamService:
    """
    Service for Waste Team Phase-2 operations.
    
    Implements state machine: REQUESTED → COLLECTED → DISPOSED → PAID
    All operations create immutable disposal logs for audit.
    """
    
    def __init__(self, session: AsyncSession):
        self._session = session
        self._notification_service = NotificationService(session)
    
    # ─────────────────────────────────────────────────────────────────────────
    # View Pickup Requests
    # ─────────────────────────────────────────────────────────────────────────
    
    async def list_pickup_requests(
        self,
        status_filter: Optional[str] = None,
        hospital_id: Optional[int] = None,
    ) -> PickupRequestList:
        """
        List all pickup requests.
        
        Args:
            status_filter: Optional status filter (requested, collected, disposed, paid)
            hospital_id: Optional hospital filter
        
        Returns:
            PickupRequestList with requests
        """
        items = []
        counts = {"pending": 0, "collected": 0, "disposed": 0, "paid": 0}
        
        # Get hospital names for display
        hospital_names = await self._get_hospital_names()
        
        for req_id, req in _pickup_requests.items():
            # Map old status to new status enum
            req_status = self._map_status(req.get("status", "pending"))
            
            # Apply filters
            if status_filter and req_status.value != status_filter:
                continue
            if hospital_id and req["hospital_id"] != hospital_id:
                continue
            
            # Count by status
            if req_status == WasteRequestStatus.REQUESTED:
                counts["pending"] += 1
            elif req_status == WasteRequestStatus.COLLECTED:
                counts["collected"] += 1
            elif req_status == WasteRequestStatus.DISPOSED:
                counts["disposed"] += 1
            elif req_status == WasteRequestStatus.PAID:
                counts["paid"] += 1
            
            items.append(PickupRequestView(
                request_id=req_id,
                hospital_id=req["hospital_id"],
                hospital_name=hospital_names.get(req["hospital_id"], req.get("hospital_name", "Unknown")),
                reported_waste_kg=req.get("current_waste_kg", 0.0),
                urgency=req.get("urgency", "normal"),
                status=req_status,
                notes=req.get("notes"),
                collected_kg=req.get("collected_kg"),
                collected_at=req.get("collected_at"),
                collected_by=req.get("collected_by"),
                disposal_method=req.get("disposal_method"),
                disposed_kg=req.get("disposed_kg"),
                disposed_at=req.get("disposed_at"),
                disposed_by=req.get("disposed_by"),
                disposal_facility=req.get("disposal_facility"),
                payment_amount=req.get("payment_amount"),
                payment_reference=req.get("payment_reference"),
                paid_at=req.get("paid_at"),
                requested_at=req.get("requested_at", datetime.utcnow()),
                requested_by=req.get("requested_by", "unknown"),
            ))
        
        # Sort by urgency (critical first) then by request time
        urgency_order = {"critical": 0, "urgent": 1, "normal": 2}
        items.sort(key=lambda x: (urgency_order.get(x.urgency, 2), x.requested_at))
        
        return PickupRequestList(
            items=items,
            total=len(items),
            pending_count=counts["pending"],
            collected_count=counts["collected"],
            disposed_count=counts["disposed"],
            paid_count=counts["paid"],
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Mark as Collected
    # ─────────────────────────────────────────────────────────────────────────
    
    async def collect_waste(
        self,
        request_id: str,
        request: CollectRequest,
        actor: RequestContext,
    ) -> CollectResponse:
        """
        Mark waste as collected.
        
        State transition: REQUESTED → COLLECTED
        
        Args:
            request_id: Pickup request ID
            request: Collection details
            actor: Request context
        
        Returns:
            CollectResponse with collection details
        """
        # Get and validate request
        pickup_req = self._get_pickup_request(request_id)
        req_status = self._map_status(pickup_req.get("status", "pending"))
        
        # Validate state transition
        if req_status != WasteRequestStatus.REQUESTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot collect: request is in '{req_status.value}' state. Expected 'requested'.",
            )
        
        hospital_id = pickup_req["hospital_id"]
        hospital_name = pickup_req.get("hospital_name", "Unknown")
        reported_kg = pickup_req.get("current_waste_kg", 0.0)
        
        now = datetime.utcnow()
        
        # Update request
        pickup_req["status"] = "collected"
        pickup_req["collected_kg"] = request.collected_kg
        pickup_req["collected_at"] = now
        pickup_req["collected_by"] = actor.role.value
        if request.notes:
            pickup_req["collection_notes"] = request.notes
        
        # Reset hospital waste level
        reset_waste_level(hospital_id)
        
        # Calculate variance
        variance_kg = request.collected_kg - reported_kg
        variance_pct = (variance_kg / reported_kg * 100) if reported_kg > 0 else 0.0
        
        # Create disposal log
        await self._create_log(
            request_id=request_id,
            action="collected",
            previous_status=WasteRequestStatus.REQUESTED.value,
            new_status=WasteRequestStatus.COLLECTED.value,
            hospital_id=hospital_id,
            waste_kg=request.collected_kg,
            performed_by=actor.role.value,
            notes=request.notes,
        )
        
        # Emit event
        emit_event(EventType.WASTE_COLLECTED, {
            "request_id": request_id,
            "hospital_id": hospital_id,
            "reported_kg": reported_kg,
            "collected_kg": request.collected_kg,
            "variance_percentage": round(variance_pct, 1),
            "collected_by": actor.role.value,
        })
        
        # Notify hospital admin
        await self._notify_hospital(
            hospital_id=hospital_id,
            title=f"Waste Collected: {request.collected_kg:.1f} kg",
            message=f"Medical waste has been collected from your facility. Amount: {request.collected_kg:.1f} kg.",
            severity=NotificationSeverity.INFO,
            actor=actor,
        )
        
        logger.info(
            f"Waste collected for request {request_id}: {request.collected_kg}kg "
            f"(reported: {reported_kg}kg, variance: {variance_pct:.1f}%)"
        )
        
        return CollectResponse(
            request_id=request_id,
            hospital_id=hospital_id,
            hospital_name=hospital_name,
            reported_waste_kg=reported_kg,
            collected_kg=request.collected_kg,
            variance_kg=round(variance_kg, 1),
            variance_percentage=round(variance_pct, 1),
            status=WasteRequestStatus.COLLECTED,
            collected_at=now,
            collected_by=actor.role.value,
            message=f"Waste collected successfully. Variance: {variance_pct:.1f}%",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Mark as Disposed
    # ─────────────────────────────────────────────────────────────────────────
    
    async def dispose_waste(
        self,
        request_id: str,
        request: DisposeRequest,
        actor: RequestContext,
    ) -> DisposeResponse:
        """
        Mark waste as disposed.
        
        State transition: COLLECTED → DISPOSED
        
        Args:
            request_id: Pickup request ID
            request: Disposal details
            actor: Request context
        
        Returns:
            DisposeResponse with disposal details
        """
        # Get and validate request
        pickup_req = self._get_pickup_request(request_id)
        req_status = self._map_status(pickup_req.get("status", "pending"))
        
        # Validate state transition
        if req_status != WasteRequestStatus.COLLECTED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot dispose: request is in '{req_status.value}' state. Expected 'collected'.",
            )
        
        collected_kg = pickup_req.get("collected_kg", 0.0)
        
        # Validate disposal weight (must not exceed collected + tolerance)
        max_allowed = collected_kg * (1 + DISPOSAL_WEIGHT_TOLERANCE)
        if request.disposed_kg > max_allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Disposal weight ({request.disposed_kg}kg) exceeds allowed maximum "
                    f"({max_allowed:.1f}kg = collected {collected_kg}kg + {DISPOSAL_WEIGHT_TOLERANCE*100:.0f}% tolerance)"
                ),
            )
        
        hospital_id = pickup_req["hospital_id"]
        hospital_name = pickup_req.get("hospital_name", "Unknown")
        
        now = datetime.utcnow()
        
        # Update request
        pickup_req["status"] = "disposed"
        pickup_req["disposal_method"] = request.disposal_method
        pickup_req["disposed_kg"] = request.disposed_kg
        pickup_req["disposed_at"] = now
        pickup_req["disposed_by"] = actor.role.value
        pickup_req["disposal_facility"] = request.disposal_facility
        if request.notes:
            pickup_req["disposal_notes"] = request.notes
        
        # Create disposal log
        await self._create_log(
            request_id=request_id,
            action="disposed",
            previous_status=WasteRequestStatus.COLLECTED.value,
            new_status=WasteRequestStatus.DISPOSED.value,
            hospital_id=hospital_id,
            waste_kg=request.disposed_kg,
            disposal_method=request.disposal_method.value,
            disposal_facility=request.disposal_facility,
            performed_by=actor.role.value,
            notes=request.notes,
        )
        
        # Emit event
        emit_event(EventType.WASTE_DISPOSED, {
            "request_id": request_id,
            "hospital_id": hospital_id,
            "disposed_kg": request.disposed_kg,
            "disposal_method": request.disposal_method.value,
            "disposal_facility": request.disposal_facility,
            "disposed_by": actor.role.value,
        })
        
        # Notify hospital admin
        await self._notify_hospital(
            hospital_id=hospital_id,
            title=f"Waste Disposed: {request.disposed_kg:.1f} kg",
            message=(
                f"Medical waste has been disposed. Method: {request.disposal_method.value}. "
                f"Facility: {request.disposal_facility}. Amount: {request.disposed_kg:.1f} kg."
            ),
            severity=NotificationSeverity.INFO,
            actor=actor,
        )
        
        logger.info(
            f"Waste disposed for request {request_id}: {request.disposed_kg}kg "
            f"via {request.disposal_method.value} at {request.disposal_facility}"
        )
        
        return DisposeResponse(
            request_id=request_id,
            hospital_id=hospital_id,
            hospital_name=hospital_name,
            collected_kg=collected_kg,
            disposed_kg=request.disposed_kg,
            disposal_method=request.disposal_method,
            disposal_facility=request.disposal_facility,
            status=WasteRequestStatus.DISPOSED,
            disposed_at=now,
            disposed_by=actor.role.value,
            message=f"Waste disposed successfully via {request.disposal_method.value}",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Mark Payment Received
    # ─────────────────────────────────────────────────────────────────────────
    
    async def record_payment(
        self,
        request_id: str,
        request: PaymentRequest,
        actor: RequestContext,
    ) -> PaymentResponse:
        """
        Record payment received.
        
        State transition: DISPOSED → PAID
        
        Args:
            request_id: Pickup request ID
            request: Payment details
            actor: Request context
        
        Returns:
            PaymentResponse with payment details
        """
        # Get and validate request
        pickup_req = self._get_pickup_request(request_id)
        req_status = self._map_status(pickup_req.get("status", "pending"))
        
        # Validate state transition
        if req_status != WasteRequestStatus.DISPOSED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot record payment: request is in '{req_status.value}' state. Expected 'disposed'.",
            )
        
        hospital_id = pickup_req["hospital_id"]
        hospital_name = pickup_req.get("hospital_name", "Unknown")
        disposed_kg = pickup_req.get("disposed_kg", 0.0)
        
        now = datetime.utcnow()
        
        # Update request
        pickup_req["status"] = "paid"
        pickup_req["payment_amount"] = request.payment_amount
        pickup_req["payment_reference"] = request.payment_reference
        pickup_req["paid_at"] = now
        pickup_req["paid_by"] = actor.role.value
        if request.notes:
            pickup_req["payment_notes"] = request.notes
        
        # Create disposal log
        await self._create_log(
            request_id=request_id,
            action="paid",
            previous_status=WasteRequestStatus.DISPOSED.value,
            new_status=WasteRequestStatus.PAID.value,
            hospital_id=hospital_id,
            waste_kg=disposed_kg,
            payment_amount=request.payment_amount,
            payment_reference=request.payment_reference,
            performed_by=actor.role.value,
            notes=request.notes,
        )
        
        # Emit event
        emit_event(EventType.WASTE_PAYMENT_COMPLETED, {
            "request_id": request_id,
            "hospital_id": hospital_id,
            "disposed_kg": disposed_kg,
            "payment_amount": request.payment_amount,
            "payment_reference": request.payment_reference,
            "paid_by": actor.role.value,
        })
        
        logger.info(
            f"Payment recorded for request {request_id}: ${request.payment_amount} "
            f"(ref: {request.payment_reference})"
        )
        
        return PaymentResponse(
            request_id=request_id,
            hospital_id=hospital_id,
            hospital_name=hospital_name,
            disposed_kg=disposed_kg,
            payment_amount=request.payment_amount,
            payment_reference=request.payment_reference,
            status=WasteRequestStatus.PAID,
            paid_at=now,
            paid_by=actor.role.value,
            message=f"Payment of ${request.payment_amount} recorded successfully",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Disposal Logs
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_disposal_logs(
        self,
        request_id: Optional[str] = None,
        hospital_id: Optional[int] = None,
        limit: int = 100,
    ) -> DisposalLogList:
        """
        Get disposal logs for audit.
        
        Args:
            request_id: Optional filter by request ID
            hospital_id: Optional filter by hospital ID
            limit: Maximum number of logs to return
        
        Returns:
            DisposalLogList with log entries
        """
        query = select(DisposalLog)
        
        if request_id:
            query = query.where(DisposalLog.request_id == request_id)
        if hospital_id:
            query = query.where(DisposalLog.hospital_id == hospital_id)
        
        query = query.order_by(DisposalLog.performed_at.desc()).limit(limit)
        
        result = await self._session.execute(query)
        logs = result.scalars().all()
        
        return DisposalLogList(
            items=[DisposalLogEntry.model_validate(log) for log in logs],
            total=len(logs),
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Private Helpers
    # ─────────────────────────────────────────────────────────────────────────
    
    def _get_pickup_request(self, request_id: str) -> dict:
        """Get pickup request by ID or raise 404."""
        if request_id not in _pickup_requests:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pickup request {request_id} not found",
            )
        return _pickup_requests[request_id]
    
    def _map_status(self, status_str: str) -> WasteRequestStatus:
        """Map string status to WasteRequestStatus enum."""
        mapping = {
            "pending": WasteRequestStatus.REQUESTED,
            "requested": WasteRequestStatus.REQUESTED,
            "collected": WasteRequestStatus.COLLECTED,
            "disposed": WasteRequestStatus.DISPOSED,
            "paid": WasteRequestStatus.PAID,
        }
        return mapping.get(status_str.lower(), WasteRequestStatus.REQUESTED)
    
    async def _get_hospital_names(self) -> dict[int, str]:
        """Get mapping of hospital IDs to names."""
        result = await self._session.execute(select(Hospital))
        hospitals = result.scalars().all()
        return {h.id: h.name for h in hospitals}
    
    async def _create_log(
        self,
        request_id: str,
        action: str,
        previous_status: Optional[str],
        new_status: str,
        hospital_id: int,
        performed_by: str,
        waste_kg: Optional[float] = None,
        disposal_method: Optional[str] = None,
        disposal_facility: Optional[str] = None,
        payment_amount: Optional[float] = None,
        payment_reference: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> DisposalLog:
        """Create an immutable disposal log entry."""
        log = DisposalLog(
            waste_request_id=0,  # No FK for in-memory requests
            request_id=request_id,
            action=action,
            previous_status=previous_status,
            new_status=new_status,
            hospital_id=hospital_id,
            waste_kg=waste_kg,
            disposal_method=disposal_method,
            disposal_facility=disposal_facility,
            payment_amount=payment_amount,
            payment_reference=payment_reference,
            performed_by=performed_by,
            performed_at=datetime.utcnow(),
            notes=notes,
        )
        
        self._session.add(log)
        await self._session.commit()
        await self._session.refresh(log)
        
        return log
    
    async def _notify_hospital(
        self,
        hospital_id: int,
        title: str,
        message: str,
        severity: NotificationSeverity,
        actor: RequestContext,
    ) -> None:
        """Send notification to hospital admin."""
        notification = NotificationCreate(
            recipient_role=UserRole.HOSPITAL_ADMIN.value,
            recipient_scope=hospital_id,
            title=title,
            message=message,
            severity=severity,
        )
        
        await self._notification_service.create_notification(notification, actor)
