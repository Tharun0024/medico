"""
Medical Staff API - Phase 2

Endpoints for Medical Staff patient workflows and waste reporting:
- Patient admission, bed assignment, transfer, discharge
- Treatment type updates
- Waste reporting and prediction
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_session
from app.core.rbac import RequestContext, require_role, UserRole
from app.modules.beds.models import WardType
from app.modules.patients.models import PatientStatus
from app.api.medical_staff.service import MedicalStaffService
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


router = APIRouter(
    prefix="/api/medical",
    tags=["medical-staff"],
)


def _validate_hospital_scope(ctx: RequestContext) -> int:
    """Validate medical staff has hospital scope."""
    if not ctx.hospital_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Hospital-ID header is required for Medical Staff operations",
        )
    return ctx.hospital_id


# ─────────────────────────────────────────────────────────────────────────────
# Patient Admission
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/patient",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Admit a patient",
    description="Admit a new patient to the hospital. Medical Staff only.",
)
async def admit_patient(
    request: PatientAdmitRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> PatientResponse:
    """
    Admit a new patient.
    
    - Creates a patient record in ADMITTED status
    - Optionally specifies preferred ward and treatment type
    - Can link to an emergency case
    - Emits patient.admitted event
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.admit_patient(hospital_id, request, ctx)


@router.get(
    "/patients",
    response_model=PatientList,
    summary="List patients",
    description="List patients in the hospital. Medical Staff only.",
)
async def list_patients(
    status_filter: Optional[PatientStatus] = Query(None, alias="status"),
    ward_type_filter: Optional[WardType] = Query(None, alias="ward"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> PatientList:
    """
    List patients in the hospital.
    
    Filters:
    - status: Filter by patient status
    - ward: Filter by ward type
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.list_patients(
        hospital_id, 
        status_filter=status_filter,
        ward_type_filter=ward_type_filter,
        skip=skip,
        limit=limit,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Bed Assignment
# ─────────────────────────────────────────────────────────────────────────────

@router.patch(
    "/patient/{patient_id}/bed",
    response_model=BedAssignResponse,
    summary="Assign patient to a bed",
    description="Assign a patient to a bed in a specific ward. Medical Staff only.",
)
async def assign_bed(
    patient_id: int,
    request: BedAssignRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> BedAssignResponse:
    """
    Assign patient to a bed.
    
    - Validates bed availability
    - Reserves the bed
    - Updates patient status to ASSIGNED
    - Emits bed.reserved and patient.bed.assigned events
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.assign_bed(hospital_id, patient_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Patient Transfer
# ─────────────────────────────────────────────────────────────────────────────

@router.patch(
    "/patient/{patient_id}/transfer",
    response_model=TransferResponse,
    summary="Transfer patient to different bed",
    description="Transfer a patient to a different bed/ward. Medical Staff only.",
)
async def transfer_patient(
    patient_id: int,
    request: TransferRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> TransferResponse:
    """
    Transfer patient to a different bed/ward.
    
    - Releases the old bed
    - Reserves the new bed
    - Emits bed.released, bed.reserved, and patient.transferred events
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.transfer_patient(hospital_id, patient_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Patient Discharge
# ─────────────────────────────────────────────────────────────────────────────

@router.patch(
    "/patient/{patient_id}/discharge",
    response_model=DischargeResponse,
    summary="Discharge patient",
    description="Discharge a patient from the hospital. Medical Staff only.",
)
async def discharge_patient(
    patient_id: int,
    request: DischargeRequest = DischargeRequest(),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> DischargeResponse:
    """
    Discharge a patient.
    
    - Releases the bed if assigned
    - Updates patient status to DISCHARGED
    - Emits bed.released and patient.discharged events
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.discharge_patient(hospital_id, patient_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Treatment Update
# ─────────────────────────────────────────────────────────────────────────────

@router.patch(
    "/patient/{patient_id}/treatment",
    response_model=TreatmentUpdateResponse,
    summary="Update patient treatment",
    description="Update the treatment type for a patient. Medical Staff only.",
)
async def update_treatment(
    patient_id: int,
    request: TreatmentUpdateRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> TreatmentUpdateResponse:
    """
    Update patient treatment type.
    
    - Updates treatment type
    - Sets patient status to IN_TREATMENT
    - Emits patient.treatment.updated event
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.update_treatment(hospital_id, patient_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Waste Reporting
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/waste/report",
    response_model=WasteReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit waste report",
    description="Submit a medical waste report from a ward. Medical Staff only.",
)
async def submit_waste_report(
    request: WasteReportRequest,
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> WasteReportResponse:
    """
    Submit a waste report.
    
    - Records waste from a specific ward
    - Updates hospital total waste level
    - Emits waste.reported event
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.submit_waste_report(hospital_id, request, ctx)


# ─────────────────────────────────────────────────────────────────────────────
# Waste Prediction
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/waste/predict",
    response_model=WastePredictionResponse,
    summary="Trigger waste prediction",
    description="Trigger a waste prediction refresh based on current occupancy. Medical Staff only.",
)
async def trigger_waste_prediction(
    request: WastePredictionRequest = WastePredictionRequest(),
    session: AsyncSession = Depends(get_session),
    ctx: RequestContext = Depends(require_role(UserRole.MEDICAL_STAFF, UserRole.HOSPITAL_ADMIN)),
) -> WastePredictionResponse:
    """
    Trigger waste prediction refresh.
    
    - Calculates prediction based on current occupancy
    - Optionally includes actual vs predicted comparison
    - Emits waste.prediction.updated event
    """
    hospital_id = _validate_hospital_scope(ctx)
    service = MedicalStaffService(session)
    return await service.get_waste_prediction(hospital_id, request, ctx)
