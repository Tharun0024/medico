"""
Super Admin Service

Business logic for Super Admin governance operations.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy import select, func, and_, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.hospitals.models import Hospital, HospitalStatus
from app.modules.beds.models import BedGroup, WardType
from app.modules.emergencies.models import EmergencyCase, EmergencySeverity
from app.modules.patients.models import Patient, PatientStatus
from app.notifications.models import Notification, NotificationSeverity
from app.notifications.schemas import NotificationCreate
from app.notifications.service import NotificationService
from app.core.event_bus import event_bus, Event, EventType
from app.core.rbac import RequestContext

from app.api.super_admin.schemas import (
    HospitalCreateRequest,
    HospitalUpdateRequest,
    HospitalResponse,
    WardSummary,
    HospitalBedSummary,
    DistrictBedSummary,
    SeverityTrend,
    WardAdmissionTrend,
    DiseaseTrendResponse,
    OutbreakRiskLevel,
    RiskFactor,
    OutbreakRiskResponse,
    AdminNoticeRequest,
    AdminNoticeResponse,
)


logger = logging.getLogger("medico.super_admin")


# ============================================================================
# Outbreak Risk Thresholds (Rule-Based, No ML)
# ============================================================================

RISK_THRESHOLDS = {
    "critical_emergency_rate": {
        "low": 0.10,        # < 10% critical = LOW risk
        "moderate": 0.20,   # 10-20% = MODERATE
        "high": 0.20,       # > 20% = HIGH
    },
    "icu_occupancy": {
        "low": 0.70,        # < 70% = LOW
        "moderate": 0.85,   # 70-85% = MODERATE
        "high": 0.85,       # > 85% = HIGH
    },
    "daily_emergency_spike": {
        "low": 1.2,         # < 1.2x average = LOW
        "moderate": 1.5,    # 1.2-1.5x = MODERATE
        "high": 1.5,        # > 1.5x = HIGH
    },
    "admission_surge": {
        "low": 1.3,         # < 1.3x average = LOW
        "moderate": 1.6,    # 1.3-1.6x = MODERATE
        "high": 1.6,        # > 1.6x = HIGH
    },
}


class SuperAdminService:
    """
    Service for Super Admin governance operations.
    
    Handles:
    - Hospital management (CRUD)
    - District-wide bed availability
    - Disease trend analysis
    - Outbreak risk inference
    - Notice/reminder dispatch
    """
    
    def __init__(self, session: AsyncSession):
        self._session = session
        self._notification_service = NotificationService(session)
    
    # ========================================================================
    # Hospital Management
    # ========================================================================
    
    async def create_hospital(
        self,
        data: HospitalCreateRequest,
        ctx: RequestContext,
    ) -> HospitalResponse:
        """
        Add a new hospital to the registry.
        
        DEPRECATED: Hospitals should be seeded from backend/data/hospitals.json
        to ensure MEDICO and AMB use consistent hospital IDs.
        
        This method is kept for backward compatibility but will fail
        because Hospital.id requires explicit assignment (not auto-increment).
        
        Use the seed_hospitals module instead:
            from app.database.seed_hospitals import seed_and_validate
            await seed_and_validate(session)
        """
        # Block manual hospital creation - hospitals must come from seed
        raise ValueError(
            "Manual hospital creation is disabled. "
            "Hospitals must be seeded from backend/data/hospitals.json "
            "to ensure MEDICO and AMB use consistent hospital IDs. "
            "Use 'python -m app.database.seed_hospitals' to seed hospitals."
        )
    
    async def update_hospital(
        self,
        hospital_id: int,
        data: HospitalUpdateRequest,
        ctx: RequestContext,
    ) -> HospitalResponse:
        """
        Update hospital details (status, capacity flags, etc.).
        """
        result = await self._session.execute(
            select(Hospital).where(Hospital.id == hospital_id)
        )
        hospital = result.scalar_one_or_none()
        
        if not hospital:
            raise ValueError(f"Hospital {hospital_id} not found")
        
        # Apply updates
        if data.name is not None:
            hospital.name = data.name
        if data.city is not None:
            hospital.city = data.city
        if data.status is not None:
            hospital.status = data.status
        
        await self._session.commit()
        await self._session.refresh(hospital)
        
        logger.info(f"Hospital updated: id={hospital.id}")
        
        # Emit event
        await event_bus.emit(Event(
            type=EventType.HOSPITAL_UPDATED,
            payload={
                "hospital_id": hospital.id,
                "updates": data.model_dump(exclude_none=True),
                "updated_by": ctx.role.value,
            }
        ))
        
        return HospitalResponse(
            id=hospital.id,
            name=hospital.name,
            city=hospital.city,
            status=hospital.status.value,
            created_at=hospital.created_at,
        )
    
    # ========================================================================
    # Bed Summary
    # ========================================================================
    
    async def get_bed_summary(self) -> DistrictBedSummary:
        """
        Get district-wide bed availability summary.
        
        Aggregates data from all hospitals and their bed groups.
        """
        # Get all hospitals
        hospitals_result = await self._session.execute(select(Hospital))
        hospitals = hospitals_result.scalars().all()
        
        # Get all bed groups
        bed_groups_result = await self._session.execute(select(BedGroup))
        bed_groups = bed_groups_result.scalars().all()
        
        # Build hospital bed map
        hospital_beds: dict = {h.id: {"hospital": h, "wards": []} for h in hospitals}
        for bg in bed_groups:
            if bg.hospital_id in hospital_beds:
                hospital_beds[bg.hospital_id]["wards"].append(bg)
        
        # Aggregate by ward type
        ward_totals: dict = {wt.value: {"capacity": 0, "occupied": 0} for wt in WardType}
        
        hospital_summaries = []
        total_active = 0
        
        for h_id, h_data in hospital_beds.items():
            hospital = h_data["hospital"]
            wards = h_data["wards"]
            
            if hospital.status == HospitalStatus.ACTIVE:
                total_active += 1
            
            h_total = 0
            h_occupied = 0
            ward_list = []
            
            for ward in wards:
                wt = ward.ward_type.value
                ward_totals[wt]["capacity"] += ward.total_capacity
                ward_totals[wt]["occupied"] += ward.occupied
                
                h_total += ward.total_capacity
                h_occupied += ward.occupied
                
                available = ward.total_capacity - ward.occupied
                occ_rate = (ward.occupied / ward.total_capacity * 100) if ward.total_capacity > 0 else 0
                
                ward_list.append(WardSummary(
                    ward_type=wt,
                    total_capacity=ward.total_capacity,
                    total_occupied=ward.occupied,
                    total_available=available,
                    occupancy_rate=round(occ_rate, 1),
                ))
            
            h_available = h_total - h_occupied
            h_occ_rate = (h_occupied / h_total * 100) if h_total > 0 else 0
            
            hospital_summaries.append(HospitalBedSummary(
                hospital_id=hospital.id,
                hospital_name=hospital.name,
                city=hospital.city,
                status=hospital.status.value,
                wards=ward_list,
                total_beds=h_total,
                total_occupied=h_occupied,
                total_available=h_available,
                overall_occupancy_rate=round(h_occ_rate, 1),
            ))
        
        # Build ward type summaries
        ward_summaries = []
        grand_total = 0
        grand_occupied = 0
        
        for wt, data in ward_totals.items():
            cap = data["capacity"]
            occ = data["occupied"]
            avail = cap - occ
            rate = (occ / cap * 100) if cap > 0 else 0
            
            grand_total += cap
            grand_occupied += occ
            
            ward_summaries.append(WardSummary(
                ward_type=wt,
                total_capacity=cap,
                total_occupied=occ,
                total_available=avail,
                occupancy_rate=round(rate, 1),
            ))
        
        grand_available = grand_total - grand_occupied
        grand_rate = (grand_occupied / grand_total * 100) if grand_total > 0 else 0
        
        return DistrictBedSummary(
            total_hospitals=len(hospitals),
            active_hospitals=total_active,
            total_beds=grand_total,
            total_occupied=grand_occupied,
            total_available=grand_available,
            overall_occupancy_rate=round(grand_rate, 1),
            by_ward_type=ward_summaries,
            hospitals=hospital_summaries,
        )
    
    # ========================================================================
    # Disease Trends
    # ========================================================================
    
    async def get_disease_trends(
        self,
        period_days: int = 7,
    ) -> DiseaseTrendResponse:
        """
        Compute disease trends from emergency and patient data.
        
        Args:
            period_days: Time window for trend calculation (default 7 days)
        
        Returns:
            Aggregated trend data
        """
        cutoff = datetime.utcnow() - timedelta(days=period_days)
        
        # Emergency counts by severity
        emergency_result = await self._session.execute(
            select(
                EmergencyCase.severity,
                func.count(EmergencyCase.id).label("count")
            )
            .where(EmergencyCase.created_at >= cutoff)
            .group_by(EmergencyCase.severity)
        )
        emergency_counts = {row.severity: row.count for row in emergency_result}
        
        total_emergencies = sum(emergency_counts.values())
        
        severity_trends = []
        for sev in EmergencySeverity:
            count = emergency_counts.get(sev, 0)
            pct = (count / total_emergencies * 100) if total_emergencies > 0 else 0
            severity_trends.append(SeverityTrend(
                severity=sev.value,
                count=count,
                percentage=round(pct, 1),
            ))
        
        # Patient admissions by ward
        admission_result = await self._session.execute(
            select(
                Patient.ward_type,
                func.count(Patient.id).label("admission_count"),
                func.sum(
                    case(
                        (Patient.status != PatientStatus.DISCHARGED, 1),
                        else_=0
                    )
                ).label("active_count"),
                func.sum(
                    case(
                        (Patient.status == PatientStatus.DISCHARGED, 1),
                        else_=0
                    )
                ).label("discharge_count"),
            )
            .where(Patient.admitted_at >= cutoff)
            .group_by(Patient.ward_type)
        )
        
        ward_trends = []
        total_admissions = 0
        
        for row in admission_result:
            ward_type = row.ward_type.value if row.ward_type else "unassigned"
            admission_count = row.admission_count or 0
            active_count = row.active_count or 0
            discharge_count = row.discharge_count or 0
            
            total_admissions += admission_count
            
            ward_trends.append(WardAdmissionTrend(
                ward_type=ward_type,
                admission_count=admission_count,
                active_patients=active_count,
                discharge_count=discharge_count,
            ))
        
        # Compute averages
        avg_daily_emergencies = total_emergencies / period_days if period_days > 0 else 0
        avg_daily_admissions = total_admissions / period_days if period_days > 0 else 0
        
        # Determine trend (compare first half vs second half of period)
        half_cutoff = datetime.utcnow() - timedelta(days=period_days // 2)
        
        first_half = await self._session.execute(
            select(func.count(EmergencyCase.id))
            .where(and_(
                EmergencyCase.created_at >= cutoff,
                EmergencyCase.created_at < half_cutoff
            ))
        )
        first_count = first_half.scalar() or 0
        
        second_half = await self._session.execute(
            select(func.count(EmergencyCase.id))
            .where(EmergencyCase.created_at >= half_cutoff)
        )
        second_count = second_half.scalar() or 0
        
        if second_count > first_count * 1.2:
            trend = "INCREASING"
        elif second_count < first_count * 0.8:
            trend = "DECREASING"
        else:
            trend = "STABLE"
        
        return DiseaseTrendResponse(
            period_days=period_days,
            total_emergencies=total_emergencies,
            emergency_by_severity=severity_trends,
            total_admissions=total_admissions,
            admissions_by_ward=ward_trends,
            avg_daily_emergencies=round(avg_daily_emergencies, 2),
            avg_daily_admissions=round(avg_daily_admissions, 2),
            trend_indicator=trend,
        )
    
    # ========================================================================
    # Outbreak Risk
    # ========================================================================
    
    async def assess_outbreak_risk(self) -> OutbreakRiskResponse:
        """
        Infer outbreak risk using rule-based thresholds.
        
        Factors considered:
        - Critical emergency rate
        - ICU occupancy rate
        - Daily emergency spike
        - Admission surge
        """
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)
        
        factors: List[RiskFactor] = []
        risk_scores = []
        
        # 1. Critical emergency rate
        total_emergencies = await self._session.execute(
            select(func.count(EmergencyCase.id))
            .where(EmergencyCase.created_at >= week_ago)
        )
        total_em = total_emergencies.scalar() or 0
        
        critical_emergencies = await self._session.execute(
            select(func.count(EmergencyCase.id))
            .where(and_(
                EmergencyCase.created_at >= week_ago,
                EmergencyCase.severity == EmergencySeverity.CRITICAL
            ))
        )
        critical_em = critical_emergencies.scalar() or 0
        
        critical_rate = critical_em / total_em if total_em > 0 else 0
        thresholds = RISK_THRESHOLDS["critical_emergency_rate"]
        
        if critical_rate >= thresholds["high"]:
            severity = "high"
            risk_scores.append(3)
        elif critical_rate >= thresholds["low"]:
            severity = "moderate"
            risk_scores.append(2)
        else:
            severity = "low"
            risk_scores.append(1)
        
        factors.append(RiskFactor(
            factor="Critical Emergency Rate",
            value=round(critical_rate * 100, 1),
            threshold=thresholds["moderate"] * 100,
            exceeds=critical_rate >= thresholds["moderate"],
            severity=severity,
        ))
        
        # 2. ICU occupancy
        icu_result = await self._session.execute(
            select(
                func.sum(BedGroup.occupied).label("occupied"),
                func.sum(BedGroup.total_capacity).label("capacity")
            )
            .where(BedGroup.ward_type == WardType.ICU)
        )
        icu_data = icu_result.first()
        icu_occupied = icu_data.occupied or 0
        icu_capacity = icu_data.capacity or 1
        
        icu_rate = icu_occupied / icu_capacity if icu_capacity > 0 else 0
        thresholds = RISK_THRESHOLDS["icu_occupancy"]
        
        if icu_rate >= thresholds["high"]:
            severity = "high"
            risk_scores.append(3)
        elif icu_rate >= thresholds["low"]:
            severity = "moderate"
            risk_scores.append(2)
        else:
            severity = "low"
            risk_scores.append(1)
        
        factors.append(RiskFactor(
            factor="ICU Occupancy Rate",
            value=round(icu_rate * 100, 1),
            threshold=thresholds["moderate"] * 100,
            exceeds=icu_rate >= thresholds["moderate"],
            severity=severity,
        ))
        
        # 3. Daily emergency spike (compare this week vs last week)
        last_week_emergencies = await self._session.execute(
            select(func.count(EmergencyCase.id))
            .where(and_(
                EmergencyCase.created_at >= two_weeks_ago,
                EmergencyCase.created_at < week_ago
            ))
        )
        last_week_em = last_week_emergencies.scalar() or 0
        
        avg_last_week = last_week_em / 7 if last_week_em > 0 else 1
        avg_this_week = total_em / 7
        spike_ratio = avg_this_week / avg_last_week if avg_last_week > 0 else 1
        
        thresholds = RISK_THRESHOLDS["daily_emergency_spike"]
        
        if spike_ratio >= thresholds["high"]:
            severity = "high"
            risk_scores.append(3)
        elif spike_ratio >= thresholds["low"]:
            severity = "moderate"
            risk_scores.append(2)
        else:
            severity = "low"
            risk_scores.append(1)
        
        factors.append(RiskFactor(
            factor="Emergency Spike Ratio",
            value=round(spike_ratio, 2),
            threshold=thresholds["moderate"],
            exceeds=spike_ratio >= thresholds["moderate"],
            severity=severity,
        ))
        
        # 4. Admission surge
        this_week_admissions = await self._session.execute(
            select(func.count(Patient.id))
            .where(Patient.admitted_at >= week_ago)
        )
        this_week_adm = this_week_admissions.scalar() or 0
        
        last_week_admissions = await self._session.execute(
            select(func.count(Patient.id))
            .where(and_(
                Patient.admitted_at >= two_weeks_ago,
                Patient.admitted_at < week_ago
            ))
        )
        last_week_adm = last_week_admissions.scalar() or 0
        
        admission_ratio = (this_week_adm / last_week_adm) if last_week_adm > 0 else 1
        thresholds = RISK_THRESHOLDS["admission_surge"]
        
        if admission_ratio >= thresholds["high"]:
            severity = "high"
            risk_scores.append(3)
        elif admission_ratio >= thresholds["low"]:
            severity = "moderate"
            risk_scores.append(2)
        else:
            severity = "low"
            risk_scores.append(1)
        
        factors.append(RiskFactor(
            factor="Admission Surge Ratio",
            value=round(admission_ratio, 2),
            threshold=thresholds["moderate"],
            exceeds=admission_ratio >= thresholds["moderate"],
            severity=severity,
        ))
        
        # Calculate overall risk level
        avg_score = sum(risk_scores) / len(risk_scores) if risk_scores else 1
        
        if avg_score >= 2.5:
            risk_level = OutbreakRiskLevel.HIGH
            confidence = min(0.95, 0.6 + (avg_score - 2.5) * 0.2)
        elif avg_score >= 1.5:
            risk_level = OutbreakRiskLevel.MODERATE
            confidence = 0.5 + (avg_score - 1.5) * 0.15
        else:
            risk_level = OutbreakRiskLevel.LOW
            confidence = 0.3 + avg_score * 0.1
        
        # Generate recommendations
        recommendations = []
        if risk_level == OutbreakRiskLevel.HIGH:
            recommendations.extend([
                "Increase ICU capacity or activate emergency protocols",
                "Review critical care staffing levels",
                "Consider temporary intake restrictions for non-critical cases",
                "Notify all hospital administrators of elevated risk",
            ])
        elif risk_level == OutbreakRiskLevel.MODERATE:
            recommendations.extend([
                "Monitor emergency intake patterns closely",
                "Prepare contingency staffing plans",
                "Review bed availability across district",
            ])
        else:
            recommendations.append("Continue standard monitoring protocols")
        
        # Emit event if risk is elevated
        if risk_level in (OutbreakRiskLevel.MODERATE, OutbreakRiskLevel.HIGH):
            await event_bus.emit(Event(
                type=EventType.OUTBREAK_RISK_DETECTED,
                payload={
                    "risk_level": risk_level.value,
                    "confidence": round(confidence, 2),
                    "factors": [f.model_dump() for f in factors],
                    "assessed_at": now.isoformat(),
                }
            ))
            logger.warning(f"Outbreak risk detected: level={risk_level.value}, confidence={confidence:.2f}")
        
        return OutbreakRiskResponse(
            risk_level=risk_level,
            confidence=round(confidence, 2),
            factors=factors,
            recommendations=recommendations,
            assessed_at=now,
        )
    
    # ========================================================================
    # Notices / Reminders
    # ========================================================================
    
    async def send_notice(
        self,
        data: AdminNoticeRequest,
        ctx: RequestContext,
    ) -> AdminNoticeResponse:
        """
        Send notice/reminder to target hospitals.
        
        Creates notifications for all targeted hospital admins.
        """
        now = datetime.utcnow()
        notice_id = str(uuid.uuid4())[:8]
        
        # Determine target hospitals
        if data.target_hospitals:
            target_ids = data.target_hospitals
        else:
            # All active hospitals
            result = await self._session.execute(
                select(Hospital.id).where(Hospital.status == HospitalStatus.ACTIVE)
            )
            target_ids = [row[0] for row in result]
        
        if not target_ids:
            raise ValueError("No target hospitals found")
        
        # Create notifications for each target
        notifications_created = 0
        
        for hospital_id in target_ids:
            notification_data = NotificationCreate(
                recipient_role=data.target_role,
                recipient_scope=hospital_id,
                title=data.title,
                message=data.message,
                severity=data.severity,
            )
            
            await self._notification_service.create_notification(notification_data, ctx)
            notifications_created += 1
        
        logger.info(
            f"Admin notice sent: id={notice_id}, "
            f"hospitals={len(target_ids)}, notifications={notifications_created}"
        )
        
        # Emit event
        await event_bus.emit(Event(
            type=EventType.ADMIN_NOTICE_SENT,
            payload={
                "notice_id": notice_id,
                "title": data.title,
                "severity": data.severity.value,
                "target_hospitals": target_ids,
                "notifications_created": notifications_created,
                "sent_by": ctx.role.value,
            }
        ))
        
        return AdminNoticeResponse(
            notice_id=notice_id,
            title=data.title,
            message=data.message,
            severity=data.severity.value,
            target_hospitals=target_ids,
            notifications_created=notifications_created,
            sent_at=now,
        )
