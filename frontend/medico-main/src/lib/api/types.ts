/**
 * TypeScript Types/Interfaces matching Backend Schemas
 * 
 * These types are derived from the FastAPI Pydantic models in the backend.
 * Keep in sync with backend/app/api/{module}/schemas.py
 */

// ============================================================================
// Enums
// ============================================================================

export type UserRole = 
  | 'super_admin'
  | 'hospital_admin'
  | 'medical_staff'
  | 'waste_team'
  | 'emergency_service'
  | 'control_room';

export type HospitalStatus = 'active' | 'inactive' | 'maintenance';

export type WardType = 'icu' | 'hdu' | 'general';

export type PatientStatus = 'admitted' | 'assigned' | 'in_treatment' | 'discharged';

export type TreatmentType = 
  | 'general'
  | 'surgical'
  | 'intensive'
  | 'emergency'
  | 'dialysis'
  | 'chemotherapy'
  | 'maternity'
  | 'pediatric';

export type EmergencySeverity = 'critical' | 'high' | 'normal';

export type EmergencyStatus = 'created' | 'assigned' | 'resolved';

export type WasteRequestStatus = 'requested' | 'collected' | 'disposed' | 'paid';

export type DisposalMethod = 'incineration' | 'autoclave' | 'chemical' | 'landfill';

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

export type OutbreakRiskLevel = 'low' | 'moderate' | 'high';

export type WasteUrgency = 'normal' | 'urgent' | 'critical';

export type WasteCategory = 
  | 'general'
  | 'infectious'
  | 'sharps'
  | 'pharmaceutical'
  | 'chemical'
  | 'radioactive';

// ============================================================================
// Hospital Types
// ============================================================================

export interface Hospital {
  id: number;
  name: string;
  city: string;
  status: HospitalStatus;
  created_at: string;
}

export interface HospitalCreateRequest {
  name: string;
  city: string;
  status?: HospitalStatus;
  icu_capacity?: number;
  hdu_capacity?: number;
  general_capacity?: number;
}

export interface HospitalUpdateRequest {
  name?: string;
  city?: string;
  status?: HospitalStatus;
  accepting_emergencies?: boolean;
}

// ============================================================================
// Bed/Ward Types
// ============================================================================

export interface WardSummary {
  ward_type: string;
  total_capacity: number;
  total_occupied: number;
  total_available: number;
  occupancy_rate: number;
}

export interface HospitalBedSummary {
  id?: number;  // For DataTable compatibility
  hospital_id: number;
  hospital_name: string;
  city: string;
  status: string;
  wards: WardSummary[];
  total_beds: number;
  total_occupied: number;
  total_available: number;
  overall_occupancy_rate: number;
}

export interface DistrictBedSummary {
  total_hospitals: number;
  active_hospitals: number;
  total_beds: number;
  total_occupied: number;
  total_available: number;
  overall_occupancy_rate: number;
  by_ward_type: WardSummary[];
  hospitals: HospitalBedSummary[];
}

export interface WardCapacityUpdate {
  ward_type: WardType;
  new_capacity: number;
}

export interface WardCapacityUpdateRequest {
  wards: WardCapacityUpdate[];
  reason?: string;
}

export interface WardCapacityStatus {
  id?: string;  // For DataTable component
  ward_type: string;
  bed_group_id: number;
  previous_capacity: number;
  new_capacity: number;
  occupied: number;
  available: number;
  occupancy_percentage: number;
}

export interface WardCapacityUpdateResponse {
  hospital_id: number;
  hospital_name: string;
  updated_wards: WardCapacityStatus[];
  message: string;
  updated_at: string;
}

// Ward Status (used by hospital admin dashboard)
export interface WardBedInfo {
  bed_id: number;
  bed_number: string;
  ward_type: WardType;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  patient_id: number | null;
  patient_name: string | null;
}

export interface WardBedStatus {
  hospital_id: number;
  hospital_name: string;
  total_beds: number;
  total_occupied: number;
  total_available: number;
  overall_occupancy_rate: number;
  wards: WardCapacityStatus[];
  beds: WardBedInfo[];
}

// ============================================================================
// Patient Types
// ============================================================================

export interface Patient {
  id: number;
  hospital_id: number;
  bed_group_id: number | null;
  ward_type: string | null;
  status: PatientStatus;
  treatment_type: TreatmentType | null;
  notes: string | null;
  emergency_id: number | null;
  admitted_at: string;
  assigned_at: string | null;
  discharged_at: string | null;
  updated_at: string;
  // UI display fields (may be populated from frontend state or extended API)
  name?: string;
  age?: number;
  gender?: string;
  diagnosis?: string;
  severity?: string;
  bed_number?: string;
}

export interface PatientList {
  items: Patient[];
  total: number;
}

export interface PatientAdmitRequest {
  ward_type?: WardType;
  treatment_type?: TreatmentType;
  emergency_id?: number;
  notes?: string;
  // UI fields for patient registration (would need backend extension)
  name?: string;
  age?: number;
  gender?: string;
  diagnosis?: string;
  severity?: string;
}

export interface BedAssignRequest {
  patient_id?: number;
  bed_id?: number;
  bed_group_id?: number;
}

export interface BedAssignResponse {
  patient_id: number;
  hospital_id: number;
  bed_group_id: number;
  ward_type: string;
  status: PatientStatus;
  assigned_at: string;
  message: string;
}

export interface TransferRequest {
  new_bed_group_id: number;
  reason?: string;
}

export interface TransferResponse {
  patient_id: number;
  previous_bed_group_id: number;
  previous_ward_type: string;
  new_bed_group_id: number;
  new_ward_type: string;
  transferred_at: string;
  message: string;
}

export interface DischargeRequest {
  notes?: string;
}

export interface DischargeResponse {
  patient_id: number;
  hospital_id: number;
  released_bed_group_id: number | null;
  released_ward_type: string | null;
  discharged_at: string;
  message: string;
}

export interface TreatmentUpdateRequest {
  treatment_type: TreatmentType;
  notes?: string;
}

export interface TreatmentUpdateResponse {
  patient_id: number;
  previous_treatment: TreatmentType | null;
  new_treatment: TreatmentType;
  updated_at: string;
  message: string;
}

// ============================================================================
// Emergency Types
// ============================================================================

export interface EmergencyCase {
  id: number;
  severity: EmergencySeverity;
  status: EmergencyStatus;
  hospital_id: number | null;
  bed_group_id: number | null;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
  notes: string | null;
}

export interface EmergencyCreateRequest {
  severity: EmergencySeverity;
  notes?: string;
}

export interface EmergencyAssignRequest {
  hospital_id: number;
  ward_type?: WardType;
}

export interface HospitalLoad {
  hospital_id: number;
  hospital_name: string;
  city: string;
  status: HospitalStatus;
  icu_available: number;
  icu_total: number;
  hdu_available: number;
  hdu_total: number;
  general_available: number;
  general_total: number;
  overall_occupancy_rate: number;
}

export interface ResponseMetrics {
  total_emergencies: number;
  resolved_count: number;
  pending_count: number;
  avg_response_time_minutes: number | null;
  by_severity: {
    severity: string;
    count: number;
    avg_response_minutes: number | null;
  }[];
}

// ============================================================================
// Waste Types
// ============================================================================

export interface WastePredictionByWard {
  ward_type: string;
  occupied_beds: number;
  waste_rate_kg_per_day: number;
  predicted_daily_kg: number;
}

export interface WastePrediction {
  hospital_id: number;
  hospital_name: string;
  current_waste_kg: number;
  alert_level: string;
  total_occupied_beds: number;
  predicted_daily_kg: number;
  predicted_weekly_kg: number;
  by_ward: WastePredictionByWard[];
  warning_threshold_kg: number;
  critical_threshold_kg: number;
  estimated_days_to_warning: number | null;
  estimated_days_to_critical: number | null;
  collection_recommended: boolean;
  recommendation: string;
  predicted_at: string;
}

export interface WasteComparison {
  hospital_id: number;
  hospital_name: string;
  period_days: number;
  actual_waste_kg: number;
  predicted_waste_kg: number;
  variance_kg: number;
  variance_percentage: number;
  assessment: string;
}

export interface PickupRequestCreate {
  urgency?: WasteUrgency;
  notes?: string;
}

export interface PickupRequestResponse {
  request_id: string;
  hospital_id: number;
  hospital_name: string;
  current_waste_kg: number;
  urgency: string;
  status: string;
  requested_at: string;
  message: string;
}

export interface PickupRequestView {
  request_id: string;
  hospital_id: number;
  hospital_name: string;
  reported_waste_kg: number;
  urgency: string;
  status: WasteRequestStatus;
  notes: string | null;
  collected_kg: number | null;
  collected_at: string | null;
  collected_by: string | null;
  disposal_method: DisposalMethod | null;
  disposed_kg: number | null;
  disposed_at: string | null;
  disposed_by: string | null;
  disposal_facility: string | null;
  payment_amount: number | null;
  payment_reference: string | null;
  paid_at: string | null;
  requested_at: string;
  requested_by: string;
}

export interface PickupRequestList {
  items: PickupRequestView[];
  total: number;
  pending_count: number;
  collected_count: number;
  disposed_count: number;
  paid_count: number;
}

export interface CollectRequest {
  collected_kg: number;
  notes?: string;
}

export interface CollectResponse {
  request_id: string;
  hospital_id: number;
  hospital_name: string;
  reported_waste_kg: number;
  collected_kg: number;
  variance_kg: number;
  variance_percentage: number;
  status: WasteRequestStatus;
  collected_at: string;
  collected_by: string;
  message: string;
}

export interface DisposeRequest {
  disposed_kg: number;
  disposal_method: DisposalMethod;
  disposal_facility: string;
  notes?: string;
}

export interface DisposeResponse {
  request_id: string;
  hospital_id: number;
  hospital_name: string;
  collected_kg: number;
  disposed_kg: number;
  disposal_method: DisposalMethod;
  disposal_facility: string;
  status: WasteRequestStatus;
  disposed_at: string;
  disposed_by: string;
  message: string;
}

export interface PaymentRequest {
  payment_amount: number;
  payment_reference: string;
  notes?: string;
}

export interface PaymentResponse {
  request_id: string;
  hospital_id: number;
  hospital_name: string;
  disposed_kg: number;
  payment_amount: number;
  payment_reference: string;
  status: WasteRequestStatus;
  paid_at: string;
  paid_by: string;
  message: string;
}

export interface WasteReportRequest {
  waste_kg: number;
  ward_type: WardType;
  category?: WasteCategory;
  notes?: string;
}

export interface WasteReportResponse {
  report_id: string;
  hospital_id: number;
  ward_type: string;
  waste_kg: number;
  category: string;
  total_hospital_waste_kg: number;
  alert_level: string;
  reported_at: string;
  message: string;
}

export interface DisposalLog {
  id: string;
  request_id: string;
  hospital_id: number;
  hospital_name: string;
  collected_kg: number;
  disposed_kg: number;
  disposal_method: DisposalMethod;
  disposal_facility: string;
  disposed_at: string;
  disposed_by: string;
}

export interface DisposalLogList {
  items: DisposalLog[];
  total: number;
}

// ============================================================================
// Disease & Outbreak Types
// ============================================================================

export interface SeverityTrend {
  severity: string;
  count: number;
  percentage: number;
}

export interface WardAdmissionTrend {
  ward_type: string;
  admission_count: number;
  active_patients: number;
  discharge_count: number;
}

export interface DiseaseTrendResponse {
  period_days: number;
  total_emergencies: number;
  emergency_by_severity: SeverityTrend[];
  total_admissions: number;
  admissions_by_ward: WardAdmissionTrend[];
  avg_daily_emergencies: number;
  avg_daily_admissions: number;
  trend_indicator: string;
}

export interface RiskFactor {
  factor: string;
  value: number;
  threshold: number;
  exceeds: boolean;
  severity: string;
}

export interface OutbreakRiskResponse {
  risk_level: OutbreakRiskLevel;
  confidence: number;
  factors: RiskFactor[];
  recommendations: string[];
  assessed_at: string;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  recipient_role: UserRole;
  recipient_hospital_id: number | null;
  read_at: string | null;
  created_at: string;
  action_url: string | null;
}

// Alias for UI usage with simplified field names
export interface NotificationResponse {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  created_at: string;
}

export interface NotificationList {
  items: Notification[];
  total: number;
  unread_count: number;
}

export interface AdminNoticeRequest {
  title: string;
  message: string;
  severity?: NotificationSeverity;
  target_hospitals?: number[];
  target_role?: string;
}

export interface AdminNoticeResponse {
  notice_id: string;
  title: string;
  message: string;
  severity: string;
  target_hospitals: number[];
  sent_count: number;
  sent_at: string;
}

// ============================================================================
// WebSocket Event Types
// ============================================================================

export interface WebSocketEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
}

export interface EmergencyCreatedEvent {
  emergency_id: number;
  severity: EmergencySeverity;
}

export interface EmergencyAssignedEvent {
  emergency_id: number;
  hospital_id: number;
  bed_group_id: number;
}

export interface EmergencyResolvedEvent {
  emergency_id: number;
  hospital_id: number;
}

export interface BedUpdatedEvent {
  hospital_id: number;
  bed_group_id: number;
  ward_type: WardType;
  previous_occupied: number;
  new_occupied: number;
  action: 'reserved' | 'released';
}

export interface PatientAdmittedEvent {
  patient_id: number;
  hospital_id: number;
}

export interface PatientDischargedEvent {
  patient_id: number;
  hospital_id: number;
  bed_group_id: number | null;
}

export interface WasteRequestedEvent {
  request_id: string;
  hospital_id: number;
  urgency: WasteUrgency;
}

export interface WasteCollectedEvent {
  request_id: string;
  hospital_id: number;
  collected_kg: number;
}

export interface WasteDisposedEvent {
  request_id: string;
  hospital_id: number;
  disposed_kg: number;
}

export interface OutbreakRiskDetectedEvent {
  risk_level: OutbreakRiskLevel;
  factors: string[];
}

export interface NotificationCreatedEvent {
  notification_id: string;
  title: string;
  severity: NotificationSeverity;
  recipient_role: UserRole;
  recipient_hospital_id: number | null;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
