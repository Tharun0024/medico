"""
Medical Staff Service

Business logic for Medical Staff Phase-2 operations:
- Patient admission, bed assignment, transfer, discharge
- Treatment type updates
- Waste reporting and prediction
"""

import logging
import uuid
from datetime import datetime
from typing import Optional, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.modules.hospitals.models import Hospital
from app.modules.beds.models import BedGroup, WardType
from app.modules.patients.models import Patient, PatientStatus, TreatmentType
from app.core.event_bus import emit_event, EventType
from app.core.rbac import RequestContext
from app.api.medical_staff.schemas import (
    PatientAdmitRequest,
    PatientResponse,
    PatientList,
    BedAssignRequest,
    BedAssignResponse,
    TransferRequest,
    TransferResponse,
    DischargeRequest,
    DischargeResponse,
    TreatmentUpdateRequest,
    TreatmentUpdateResponse,
    WasteReportRequest,
    WasteReportResponse,
    WastePredictionRequest,
    WastePredictionResponse,
)

# Import waste tracking from waste dashboard service
from app.api.services.waste_dashboard_service import (
    _waste_levels,
    _get_alert_level,
    update_waste_level,
    WARNING_THRESHOLD_KG,
    CRITICAL_THRESHOLD_KG,
)

# Import waste prediction rates from hospital admin service
from app.api.hospital_admin.service import WASTE_RATE_BY_WARD


logger = logging.getLogger("medico.medical_staff")


# In-memory waste report store
_waste_reports: dict[str, dict] = {}


class MedicalStaffService:
    """
    Service for Medical Staff Phase-2 operations.
    
    Provides patient workflows and waste reporting.
    All operations are hospital-scoped.
    """
    
    def __init__(self, session: AsyncSession):
        self._session = session
    
    # ─────────────────────────────────────────────────────────────────────────
    # Patient Admission
    # ─────────────────────────────────────────────────────────────────────────
    
    async def admit_patient(
        self,
        hospital_id: int,
        request: PatientAdmitRequest,
        actor: RequestContext,
    ) -> PatientResponse:
        """
        Admit a new patient to the hospital.
        
        Args:
            hospital_id: Hospital admitting the patient
            request: Admission details
            actor: Request context of the medical staff
        
        Returns:
            PatientResponse with new patient details
        """
        # Validate hospital exists
        await self._get_hospital(hospital_id)
        
        # Create patient record
        patient = Patient(
            hospital_id=hospital_id,
            ward_type=request.ward_type,
            treatment_type=request.treatment_type,
            emergency_id=request.emergency_id,
            notes=request.notes,
            status=PatientStatus.ADMITTED,
            admitted_at=datetime.utcnow(),
        )
        
        self._session.add(patient)
        await self._session.commit()
        await self._session.refresh(patient)
        
        # Emit event
        emit_event(EventType.PATIENT_ADMITTED, {
            "patient_id": patient.id,
            "hospital_id": hospital_id,
            "ward_type": request.ward_type.value if request.ward_type else None,
            "treatment_type": request.treatment_type.value if request.treatment_type else None,
            "emergency_id": request.emergency_id,
        })
        
        logger.info(f"Patient {patient.id} admitted to hospital {hospital_id}")
        
        return self._to_response(patient)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Bed Assignment
    # ─────────────────────────────────────────────────────────────────────────
    
    async def assign_bed(
        self,
        hospital_id: int,
        patient_id: int,
        request: BedAssignRequest,
        actor: RequestContext,
    ) -> BedAssignResponse:
        """
        Assign a patient to a bed.
        
        Args:
            hospital_id: Hospital context
            patient_id: Patient to assign
            request: Bed assignment details
            actor: Request context
        
        Returns:
            BedAssignResponse with assignment details
        """
        # Get patient and validate
        patient = await self._get_patient(patient_id, hospital_id)
        
        if patient.status == PatientStatus.DISCHARGED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient {patient_id} has been discharged",
            )
        
        if patient.bed_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient {patient_id} already has a bed. Use transfer endpoint.",
            )
        
        # Get and validate bed group
        bed_group = await self._get_bed_group(request.bed_group_id, hospital_id)
        
        # Check availability
        if bed_group.occupied >= bed_group.total_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No beds available in {bed_group.ward_type.value.upper()} ward",
            )
        
        # Reserve bed
        bed_group.occupied += 1
        
        # Update patient
        patient.bed_group_id = bed_group.id
        patient.ward_type = bed_group.ward_type
        patient.status = PatientStatus.ASSIGNED
        patient.assigned_at = datetime.utcnow()
        
        await self._session.commit()
        await self._session.refresh(patient)
        
        # Emit events
        emit_event(EventType.BED_RESERVED, {
            "bed_group_id": bed_group.id,
            "hospital_id": hospital_id,
            "ward_type": bed_group.ward_type.value,
            "patient_id": patient_id,
        })
        
        emit_event(EventType.PATIENT_BED_ASSIGNED, {
            "patient_id": patient_id,
            "hospital_id": hospital_id,
            "bed_group_id": bed_group.id,
            "ward_type": bed_group.ward_type.value,
        })
        
        logger.info(
            f"Patient {patient_id} assigned to bed group {bed_group.id} "
            f"({bed_group.ward_type.value})"
        )
        
        return BedAssignResponse(
            patient_id=patient_id,
            hospital_id=hospital_id,
            bed_group_id=bed_group.id,
            ward_type=bed_group.ward_type.value,
            status=patient.status,
            assigned_at=patient.assigned_at,
            message=f"Patient assigned to {bed_group.ward_type.value.upper()} ward",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Patient Transfer
    # ─────────────────────────────────────────────────────────────────────────
    
    async def transfer_patient(
        self,
        hospital_id: int,
        patient_id: int,
        request: TransferRequest,
        actor: RequestContext,
    ) -> TransferResponse:
        """
        Transfer a patient to a different bed/ward.
        
        Releases the old bed and reserves the new one.
        
        Args:
            hospital_id: Hospital context
            patient_id: Patient to transfer
            request: Transfer details
            actor: Request context
        
        Returns:
            TransferResponse with transfer details
        """
        # Get patient and validate
        patient = await self._get_patient(patient_id, hospital_id)
        
        if patient.status == PatientStatus.DISCHARGED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient {patient_id} has been discharged",
            )
        
        if not patient.bed_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient {patient_id} has no bed. Use assign endpoint.",
            )
        
        # Cannot transfer to same bed
        if patient.bed_group_id == request.new_bed_group_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient is already in this bed group",
            )
        
        # Get previous bed group
        prev_bed_group = await self._get_bed_group(patient.bed_group_id, hospital_id)
        prev_bed_group_id = prev_bed_group.id
        prev_ward_type = prev_bed_group.ward_type
        
        # Get new bed group
        new_bed_group = await self._get_bed_group(request.new_bed_group_id, hospital_id)
        
        # Check availability in new ward
        if new_bed_group.occupied >= new_bed_group.total_capacity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"No beds available in {new_bed_group.ward_type.value.upper()} ward",
            )
        
        # Release old bed
        if prev_bed_group.occupied > 0:
            prev_bed_group.occupied -= 1
        
        # Reserve new bed
        new_bed_group.occupied += 1
        
        # Update patient
        patient.bed_group_id = new_bed_group.id
        patient.ward_type = new_bed_group.ward_type
        
        await self._session.commit()
        
        now = datetime.utcnow()
        
        # Emit events
        emit_event(EventType.BED_RELEASED, {
            "bed_group_id": prev_bed_group_id,
            "hospital_id": hospital_id,
            "patient_id": patient_id,
        })
        
        emit_event(EventType.BED_RESERVED, {
            "bed_group_id": new_bed_group.id,
            "hospital_id": hospital_id,
            "ward_type": new_bed_group.ward_type.value,
            "patient_id": patient_id,
        })
        
        emit_event(EventType.PATIENT_TRANSFERRED, {
            "patient_id": patient_id,
            "hospital_id": hospital_id,
            "from_bed_group_id": prev_bed_group_id,
            "from_ward_type": prev_ward_type.value,
            "to_bed_group_id": new_bed_group.id,
            "to_ward_type": new_bed_group.ward_type.value,
            "reason": request.reason,
        })
        
        logger.info(
            f"Patient {patient_id} transferred from {prev_ward_type.value} to "
            f"{new_bed_group.ward_type.value}"
        )
        
        return TransferResponse(
            patient_id=patient_id,
            previous_bed_group_id=prev_bed_group_id,
            previous_ward_type=prev_ward_type.value,
            new_bed_group_id=new_bed_group.id,
            new_ward_type=new_bed_group.ward_type.value,
            transferred_at=now,
            message=f"Patient transferred from {prev_ward_type.value.upper()} to {new_bed_group.ward_type.value.upper()}",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Patient Discharge
    # ─────────────────────────────────────────────────────────────────────────
    
    async def discharge_patient(
        self,
        hospital_id: int,
        patient_id: int,
        request: DischargeRequest,
        actor: RequestContext,
    ) -> DischargeResponse:
        """
        Discharge a patient from the hospital.
        
        Releases the bed if one was assigned.
        
        Args:
            hospital_id: Hospital context
            patient_id: Patient to discharge
            request: Discharge details
            actor: Request context
        
        Returns:
            DischargeResponse with discharge details
        """
        # Get patient and validate
        patient = await self._get_patient(patient_id, hospital_id)
        
        if patient.status == PatientStatus.DISCHARGED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient {patient_id} is already discharged",
            )
        
        # Track bed info before discharge
        released_bed_group_id = patient.bed_group_id
        released_ward_type = patient.ward_type
        
        # Release bed if assigned
        if released_bed_group_id:
            bed_group = await self._get_bed_group(released_bed_group_id, hospital_id)
            if bed_group.occupied > 0:
                bed_group.occupied -= 1
        
        # Update patient
        patient.status = PatientStatus.DISCHARGED
        patient.discharged_at = datetime.utcnow()
        if request.notes:
            patient.notes = (patient.notes or "") + f"\nDischarge: {request.notes}"
        
        await self._session.commit()
        
        # Emit events
        if released_bed_group_id:
            emit_event(EventType.BED_RELEASED, {
                "bed_group_id": released_bed_group_id,
                "hospital_id": hospital_id,
                "patient_id": patient_id,
            })
        
        emit_event(EventType.PATIENT_DISCHARGED, {
            "patient_id": patient_id,
            "hospital_id": hospital_id,
            "released_bed_group_id": released_bed_group_id,
            "released_ward_type": released_ward_type.value if released_ward_type else None,
        })
        
        logger.info(f"Patient {patient_id} discharged from hospital {hospital_id}")
        
        return DischargeResponse(
            patient_id=patient_id,
            hospital_id=hospital_id,
            released_bed_group_id=released_bed_group_id,
            released_ward_type=released_ward_type.value if released_ward_type else None,
            discharged_at=patient.discharged_at,
            message="Patient discharged successfully",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Treatment Update
    # ─────────────────────────────────────────────────────────────────────────
    
    async def update_treatment(
        self,
        hospital_id: int,
        patient_id: int,
        request: TreatmentUpdateRequest,
        actor: RequestContext,
    ) -> TreatmentUpdateResponse:
        """
        Update patient treatment type.
        
        Args:
            hospital_id: Hospital context
            patient_id: Patient to update
            request: Treatment update details
            actor: Request context
        
        Returns:
            TreatmentUpdateResponse with update details
        """
        # Get patient and validate
        patient = await self._get_patient(patient_id, hospital_id)
        
        if patient.status == PatientStatus.DISCHARGED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Patient {patient_id} has been discharged",
            )
        
        previous_treatment = patient.treatment_type
        
        # Update treatment
        patient.treatment_type = request.treatment_type
        patient.status = PatientStatus.IN_TREATMENT
        if request.notes:
            patient.notes = (patient.notes or "") + f"\nTreatment: {request.notes}"
        
        await self._session.commit()
        
        now = datetime.utcnow()
        
        # Emit event
        emit_event(EventType.PATIENT_TREATMENT_UPDATED, {
            "patient_id": patient_id,
            "hospital_id": hospital_id,
            "previous_treatment": previous_treatment.value if previous_treatment else None,
            "new_treatment": request.treatment_type.value,
        })
        
        logger.info(
            f"Patient {patient_id} treatment updated to {request.treatment_type.value}"
        )
        
        return TreatmentUpdateResponse(
            patient_id=patient_id,
            previous_treatment=previous_treatment,
            new_treatment=request.treatment_type,
            updated_at=now,
            message=f"Treatment updated to {request.treatment_type.value}",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Waste Reporting
    # ─────────────────────────────────────────────────────────────────────────
    
    async def submit_waste_report(
        self,
        hospital_id: int,
        request: WasteReportRequest,
        actor: RequestContext,
    ) -> WasteReportResponse:
        """
        Submit a waste report.
        
        Args:
            hospital_id: Hospital context
            request: Waste report details
            actor: Request context
        
        Returns:
            WasteReportResponse with report details
        """
        # Validate hospital exists
        hospital = await self._get_hospital(hospital_id)
        
        # Create report
        report_id = f"WR-{hospital_id}-{uuid.uuid4().hex[:8]}"
        now = datetime.utcnow()
        
        _waste_reports[report_id] = {
            "report_id": report_id,
            "hospital_id": hospital_id,
            "ward_type": request.ward_type.value,
            "waste_kg": request.waste_kg,
            "category": request.category,
            "notes": request.notes,
            "reported_at": now,
            "reported_by": actor.role.value,
        }
        
        # Update waste level
        update_waste_level(hospital_id, request.waste_kg)
        total_waste = _waste_levels.get(hospital_id, 0.0)
        alert_level = _get_alert_level(total_waste)
        
        # Emit event
        emit_event(EventType.WASTE_REPORTED, {
            "report_id": report_id,
            "hospital_id": hospital_id,
            "ward_type": request.ward_type.value,
            "waste_kg": request.waste_kg,
            "category": request.category,
            "total_hospital_waste_kg": total_waste,
            "alert_level": alert_level.value,
        })
        
        logger.info(
            f"Waste report {report_id}: {request.waste_kg}kg from "
            f"{request.ward_type.value} ward at hospital {hospital_id}"
        )
        
        return WasteReportResponse(
            report_id=report_id,
            hospital_id=hospital_id,
            ward_type=request.ward_type.value,
            waste_kg=request.waste_kg,
            category=request.category,
            total_hospital_waste_kg=round(total_waste, 1),
            alert_level=alert_level.value,
            reported_at=now,
            message=f"Waste report submitted. Total hospital waste: {total_waste:.1f} kg",
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Waste Prediction
    # ─────────────────────────────────────────────────────────────────────────
    
    async def get_waste_prediction(
        self,
        hospital_id: int,
        request: WastePredictionRequest,
        actor: RequestContext,
    ) -> WastePredictionResponse:
        """
        Trigger a waste prediction refresh.
        
        Args:
            hospital_id: Hospital context
            request: Prediction request details
            actor: Request context
        
        Returns:
            WastePredictionResponse with prediction details
        """
        # Validate hospital
        hospital = await self._get_hospital(hospital_id)
        
        # Get bed groups for prediction
        result = await self._session.execute(
            select(BedGroup).where(BedGroup.hospital_id == hospital_id)
        )
        bed_groups = list(result.scalars().all())
        
        # Calculate prediction
        total_daily = 0.0
        for bg in bed_groups:
            rate = WASTE_RATE_BY_WARD.get(bg.ward_type, 2.5)
            total_daily += bg.occupied * rate
        
        # Get current waste
        current_waste = _waste_levels.get(hospital_id, 0.0)
        alert_level = _get_alert_level(current_waste)
        
        # Collection recommendation
        collection_recommended = current_waste >= WARNING_THRESHOLD_KG
        if alert_level.value == "critical":
            recommendation = "CRITICAL: Immediate collection required."
        elif alert_level.value == "warning":
            recommendation = "WARNING: Schedule collection soon."
        else:
            recommendation = "Waste levels normal."
        
        now = datetime.utcnow()
        
        # Comparison if requested
        variance = None
        assessment = None
        if request.include_comparison and total_daily > 0:
            # Simple 7-day comparison
            predicted_7d = total_daily * 7
            variance = round((current_waste - predicted_7d) / predicted_7d * 100, 1) if predicted_7d > 0 else 0.0
            if abs(variance) <= 15:
                assessment = "on_track"
            elif variance > 15:
                assessment = "above_predicted"
            else:
                assessment = "below_predicted"
        
        # Emit event
        emit_event(EventType.WASTE_PREDICTION_UPDATED, {
            "hospital_id": hospital_id,
            "current_waste_kg": current_waste,
            "predicted_daily_kg": total_daily,
            "alert_level": alert_level.value,
        })
        
        return WastePredictionResponse(
            hospital_id=hospital_id,
            hospital_name=hospital.name,
            current_waste_kg=round(current_waste, 1),
            predicted_daily_kg=round(total_daily, 1),
            predicted_weekly_kg=round(total_daily * 7, 1),
            alert_level=alert_level.value,
            collection_recommended=collection_recommended,
            recommendation=recommendation,
            actual_vs_predicted_variance=variance,
            variance_assessment=assessment,
            predicted_at=now,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Patient Listing (Read)
    # ─────────────────────────────────────────────────────────────────────────
    
    async def list_patients(
        self,
        hospital_id: int,
        status_filter: Optional[PatientStatus] = None,
        ward_type_filter: Optional[WardType] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> PatientList:
        """
        List patients in the hospital.
        
        Args:
            hospital_id: Hospital to list patients for
            status_filter: Optional status filter
            ward_type_filter: Optional ward type filter
            skip: Pagination offset
            limit: Pagination limit
        
        Returns:
            PatientList with patients
        """
        query = select(Patient).where(Patient.hospital_id == hospital_id)
        count_query = select(func.count(Patient.id)).where(Patient.hospital_id == hospital_id)
        
        if status_filter:
            query = query.where(Patient.status == status_filter)
            count_query = count_query.where(Patient.status == status_filter)
        
        if ward_type_filter:
            query = query.where(Patient.ward_type == ward_type_filter)
            count_query = count_query.where(Patient.ward_type == ward_type_filter)
        
        query = query.order_by(Patient.admitted_at.desc()).offset(skip).limit(limit)
        
        result = await self._session.execute(query)
        patients = result.scalars().all()
        
        count_result = await self._session.execute(count_query)
        total = count_result.scalar_one()
        
        return PatientList(
            items=[self._to_response(p) for p in patients],
            total=total,
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
    
    async def _get_patient(self, patient_id: int, hospital_id: int) -> Patient:
        """Fetch patient by ID and hospital, or raise 404."""
        result = await self._session.execute(
            select(Patient).where(
                Patient.id == patient_id,
                Patient.hospital_id == hospital_id,
            )
        )
        patient = result.scalar_one_or_none()
        
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient {patient_id} not found in hospital {hospital_id}",
            )
        
        return patient
    
    async def _get_bed_group(self, bed_group_id: int, hospital_id: int) -> BedGroup:
        """Fetch bed group by ID and hospital, or raise 404."""
        result = await self._session.execute(
            select(BedGroup).where(
                BedGroup.id == bed_group_id,
                BedGroup.hospital_id == hospital_id,
            )
        )
        bed_group = result.scalar_one_or_none()
        
        if not bed_group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Bed group {bed_group_id} not found in hospital {hospital_id}",
            )
        
        return bed_group
    
    def _to_response(self, patient: Patient) -> PatientResponse:
        """Convert Patient model to response schema."""
        return PatientResponse(
            id=patient.id,
            hospital_id=patient.hospital_id,
            bed_group_id=patient.bed_group_id,
            ward_type=patient.ward_type.value if patient.ward_type else None,
            status=patient.status,
            treatment_type=patient.treatment_type,
            notes=patient.notes,
            emergency_id=patient.emergency_id,
            admitted_at=patient.admitted_at,
            assigned_at=patient.assigned_at,
            discharged_at=patient.discharged_at,
            updated_at=patient.updated_at,
        )
