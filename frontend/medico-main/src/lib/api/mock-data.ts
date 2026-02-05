/**
 * Mock Data for Demo Mode
 * 
 * Provides realistic mock data for all dashboard features when backend is unavailable.
 * Used as fallback in API calls to ensure demo-friendly experience.
 * 
 * NOTE: All data is STATIC to prevent hydration mismatches between server and client.
 * Do NOT use Date.now(), Math.random(), or any non-deterministic functions here.
 */

import type {
  Hospital,
  DistrictBedSummary,
  HospitalBedSummary,
  WardSummary,
  WardCapacityUpdateResponse,
  WastePrediction,
  WasteComparison,
  PickupRequestView,
  Patient,
  PatientList,
  EmergencyCase,
  HospitalLoad,
  ResponseMetrics,
  DiseaseTrendResponse,
  OutbreakRiskResponse,
  Notification,
} from './types';

// ============================================================================
// Static Date Constants (to avoid hydration mismatches)
// ============================================================================

const BASE_DATE = "2026-02-05T10:00:00.000Z";
const DAY_1_AGO = "2026-02-04T14:30:00.000Z";
const DAY_2_AGO = "2026-02-03T09:15:00.000Z";
const DAY_3_AGO = "2026-02-02T16:45:00.000Z";
const DAY_4_AGO = "2026-02-01T11:20:00.000Z";
const DAY_5_AGO = "2026-01-31T08:30:00.000Z";
const DAY_7_AGO = "2026-01-29T13:00:00.000Z";
const DAY_8_AGO = "2026-01-28T10:00:00.000Z";
const DAY_9_AGO = "2026-01-27T15:30:00.000Z";
const DAY_10_AGO = "2026-01-26T09:45:00.000Z";
const DAY_12_AGO = "2026-01-24T14:15:00.000Z";
const DAY_14_AGO = "2026-01-22T10:00:00.000Z";

// ============================================================================
// Mock Hospitals
// ============================================================================

export const mockHospitals: Hospital[] = [
  { id: 1, name: "City General Hospital", city: "Metro City", status: "active", created_at: "2024-01-15T08:00:00Z" },
  { id: 2, name: "Metro Medical Center", city: "Metro City", status: "active", created_at: "2024-01-15T08:00:00Z" },
  { id: 3, name: "Green Valley Hospital", city: "Green Valley", status: "active", created_at: "2024-02-01T08:00:00Z" },
  { id: 4, name: "Sunrise Healthcare", city: "Sunrise District", status: "active", created_at: "2024-02-15T08:00:00Z" },
  { id: 5, name: "Apollo Healthcare", city: "Central District", status: "active", created_at: "2024-03-01T08:00:00Z" },
  { id: 6, name: "Unity Medical Center", city: "Metro City", status: "active", created_at: "2024-03-15T08:00:00Z" },
  { id: 7, name: "Lakeside Hospital", city: "Lakeside", status: "maintenance", created_at: "2024-04-01T08:00:00Z" },
  { id: 8, name: "Central District Hospital", city: "Central District", status: "active", created_at: "2024-04-15T08:00:00Z" },
];

// ============================================================================
// Static Ward Summaries (pre-computed, no randomness)
// ============================================================================

const staticWardSummaries: Record<string, WardSummary[]> = {
  "1": [
    { ward_type: "ICU", total_capacity: 30, total_occupied: 22, total_available: 8, occupancy_rate: 73 },
    { ward_type: "HDU", total_capacity: 45, total_occupied: 38, total_available: 7, occupancy_rate: 84 },
    { ward_type: "General", total_capacity: 150, total_occupied: 112, total_available: 38, occupancy_rate: 75 },
  ],
  "2": [
    { ward_type: "ICU", total_capacity: 35, total_occupied: 28, total_available: 7, occupancy_rate: 80 },
    { ward_type: "HDU", total_capacity: 50, total_occupied: 42, total_available: 8, occupancy_rate: 84 },
    { ward_type: "General", total_capacity: 180, total_occupied: 145, total_available: 35, occupancy_rate: 81 },
  ],
  "3": [
    { ward_type: "ICU", total_capacity: 25, total_occupied: 18, total_available: 7, occupancy_rate: 72 },
    { ward_type: "HDU", total_capacity: 40, total_occupied: 30, total_available: 10, occupancy_rate: 75 },
    { ward_type: "General", total_capacity: 120, total_occupied: 85, total_available: 35, occupancy_rate: 71 },
  ],
  "4": [
    { ward_type: "ICU", total_capacity: 28, total_occupied: 24, total_available: 4, occupancy_rate: 86 },
    { ward_type: "HDU", total_capacity: 42, total_occupied: 35, total_available: 7, occupancy_rate: 83 },
    { ward_type: "General", total_capacity: 140, total_occupied: 98, total_available: 42, occupancy_rate: 70 },
  ],
  "5": [
    { ward_type: "ICU", total_capacity: 32, total_occupied: 26, total_available: 6, occupancy_rate: 81 },
    { ward_type: "HDU", total_capacity: 48, total_occupied: 40, total_available: 8, occupancy_rate: 83 },
    { ward_type: "General", total_capacity: 160, total_occupied: 128, total_available: 32, occupancy_rate: 80 },
  ],
  "6": [
    { ward_type: "ICU", total_capacity: 30, total_occupied: 21, total_available: 9, occupancy_rate: 70 },
    { ward_type: "HDU", total_capacity: 45, total_occupied: 32, total_available: 13, occupancy_rate: 71 },
    { ward_type: "General", total_capacity: 145, total_occupied: 102, total_available: 43, occupancy_rate: 70 },
  ],
  "7": [
    { ward_type: "ICU", total_capacity: 20, total_occupied: 8, total_available: 12, occupancy_rate: 40 },
    { ward_type: "HDU", total_capacity: 35, total_occupied: 15, total_available: 20, occupancy_rate: 43 },
    { ward_type: "General", total_capacity: 100, total_occupied: 40, total_available: 60, occupancy_rate: 40 },
  ],
  "8": [
    { ward_type: "ICU", total_capacity: 40, total_occupied: 32, total_available: 8, occupancy_rate: 80 },
    { ward_type: "HDU", total_capacity: 55, total_occupied: 45, total_available: 10, occupancy_rate: 82 },
    { ward_type: "General", total_capacity: 205, total_occupied: 164, total_available: 41, occupancy_rate: 80 },
  ],
};

// ============================================================================
// Static Hospital Bed Summaries
// ============================================================================

const staticHospitalBedSummaries: HospitalBedSummary[] = mockHospitals.map(hospital => {
  const wards = staticWardSummaries[String(hospital.id)] || staticWardSummaries["1"];
  const totalBeds = wards.reduce((sum, w) => sum + w.total_capacity, 0);
  const totalOccupied = wards.reduce((sum, w) => sum + w.total_occupied, 0);
  
  return {
    id: hospital.id,
    hospital_id: hospital.id,
    hospital_name: hospital.name,
    city: hospital.city,
    status: hospital.status,
    wards,
    total_beds: totalBeds,
    total_occupied: totalOccupied,
    total_available: totalBeds - totalOccupied,
    overall_occupancy_rate: Math.round((totalOccupied / totalBeds) * 100),
  };
});

export const mockDistrictBedSummary: DistrictBedSummary = (() => {
  const hospitals = staticHospitalBedSummaries;
  const totalBeds = hospitals.reduce((sum, h) => sum + h.total_beds, 0);
  const totalOccupied = hospitals.reduce((sum, h) => sum + h.total_occupied, 0);
  
  return {
    total_hospitals: mockHospitals.length,
    active_hospitals: mockHospitals.filter(h => h.status === "active").length,
    total_beds: totalBeds,
    total_occupied: totalOccupied,
    total_available: totalBeds - totalOccupied,
    overall_occupancy_rate: Math.round((totalOccupied / totalBeds) * 100),
    by_ward_type: [
      { ward_type: "ICU", total_capacity: 240, total_occupied: 179, total_available: 61, occupancy_rate: 75 },
      { ward_type: "HDU", total_capacity: 360, total_occupied: 277, total_available: 83, occupancy_rate: 77 },
      { ward_type: "General", total_capacity: 1200, total_occupied: 874, total_available: 326, occupancy_rate: 73 },
    ],
    hospitals,
  };
})();

export const mockWardStatus: WardCapacityUpdateResponse = {
  hospital_id: 1,
  hospital_name: "City General Hospital",
  updated_wards: [
    { id: "icu-1", ward_type: "ICU", bed_group_id: 1, previous_capacity: 30, new_capacity: 30, occupied: 22, available: 8, occupancy_percentage: 73 },
    { id: "hdu-1", ward_type: "HDU", bed_group_id: 2, previous_capacity: 45, new_capacity: 45, occupied: 38, available: 7, occupancy_percentage: 84 },
    { id: "general-1", ward_type: "General", bed_group_id: 3, previous_capacity: 150, new_capacity: 150, occupied: 112, available: 38, occupancy_percentage: 75 },
  ],
  message: "Current ward status retrieved",
  updated_at: BASE_DATE,
};

// ============================================================================
// Mock Waste Data
// ============================================================================

export const mockWastePrediction: WastePrediction = {
  hospital_id: 1,
  hospital_name: "City General Hospital",
  current_waste_kg: 234.5,
  alert_level: "normal",
  total_occupied_beds: 172,
  predicted_daily_kg: 86.2,
  predicted_weekly_kg: 603.4,
  by_ward: [
    { ward_type: "ICU", occupied_beds: 22, waste_rate_kg_per_day: 2.5, predicted_daily_kg: 55.0 },
    { ward_type: "HDU", occupied_beds: 38, waste_rate_kg_per_day: 1.2, predicted_daily_kg: 45.6 },
    { ward_type: "General", occupied_beds: 112, waste_rate_kg_per_day: 0.5, predicted_daily_kg: 56.0 },
  ],
  warning_threshold_kg: 500,
  critical_threshold_kg: 800,
  estimated_days_to_warning: 3,
  estimated_days_to_critical: 6,
  collection_recommended: false,
  recommendation: "Waste levels are normal. Next scheduled pickup in 3 days.",
  predicted_at: BASE_DATE,
};

export const mockWasteComparison: WasteComparison = {
  hospital_id: 1,
  hospital_name: "City General Hospital",
  period_days: 7,
  actual_waste_kg: 589.3,
  predicted_waste_kg: 603.4,
  variance_kg: -14.1,
  variance_percentage: -2.3,
  assessment: "Excellent prediction accuracy. Actual waste was 2.3% below predicted.",
};

export const mockPickupRequests: PickupRequestView[] = [
  {
    request_id: "REQ-2024-001",
    hospital_id: 1,
    hospital_name: "City General Hospital",
    reported_waste_kg: 456.2,
    urgency: "normal",
    status: "requested",
    notes: "Regular weekly pickup",
    collected_kg: null,
    collected_at: null,
    collected_by: null,
    disposal_method: null,
    disposed_kg: null,
    disposed_at: null,
    disposed_by: null,
    disposal_facility: null,
    payment_amount: null,
    payment_reference: null,
    paid_at: null,
    requested_at: DAY_2_AGO,
    requested_by: "Hospital Admin",
  },
  {
    request_id: "REQ-2024-002",
    hospital_id: 2,
    hospital_name: "Metro Medical Center",
    reported_waste_kg: 312.8,
    urgency: "urgent",
    status: "collected",
    notes: "Urgent: infectious waste from isolation ward",
    collected_kg: 315.2,
    collected_at: DAY_1_AGO,
    collected_by: "John Smith",
    disposal_method: null,
    disposed_kg: null,
    disposed_at: null,
    disposed_by: null,
    disposal_facility: null,
    payment_amount: null,
    payment_reference: null,
    paid_at: null,
    requested_at: DAY_3_AGO,
    requested_by: "Hospital Admin",
  },
  {
    request_id: "REQ-2024-003",
    hospital_id: 3,
    hospital_name: "Green Valley Hospital",
    reported_waste_kg: 198.5,
    urgency: "normal",
    status: "disposed",
    notes: null,
    collected_kg: 201.3,
    collected_at: DAY_5_AGO,
    collected_by: "Mike Johnson",
    disposal_method: "incineration",
    disposed_kg: 201.3,
    disposed_at: DAY_4_AGO,
    disposed_by: "WasteDisposal Co.",
    disposal_facility: "Central Incineration Plant",
    payment_amount: null,
    payment_reference: null,
    paid_at: null,
    requested_at: DAY_7_AGO,
    requested_by: "Hospital Admin",
  },
  {
    request_id: "REQ-2024-004",
    hospital_id: 4,
    hospital_name: "Sunrise Healthcare",
    reported_waste_kg: 287.9,
    urgency: "normal",
    status: "paid",
    notes: "Monthly comprehensive cleanup",
    collected_kg: 290.1,
    collected_at: DAY_10_AGO,
    collected_by: "Sarah Williams",
    disposal_method: "autoclave",
    disposed_kg: 290.1,
    disposed_at: DAY_9_AGO,
    disposed_by: "BioWaste Solutions",
    disposal_facility: "BioWaste Treatment Center",
    payment_amount: 1450.50,
    payment_reference: "PAY-2024-0892",
    paid_at: DAY_8_AGO,
    requested_at: DAY_12_AGO,
    requested_by: "Hospital Admin",
  },
];

// ============================================================================
// Mock Patient Data (Static)
// ============================================================================

export const mockPatients: Patient[] = [
  { id: 1, hospital_id: 1, bed_group_id: 1, ward_type: "ICU", status: "in_treatment", treatment_type: "intensive", notes: null, emergency_id: 2, admitted_at: DAY_14_AGO, assigned_at: DAY_12_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "John Doe", age: 65, gender: "Male", diagnosis: "Cardiac arrhythmia", severity: "high", bed_number: "A101" },
  { id: 2, hospital_id: 1, bed_group_id: 2, ward_type: "HDU", status: "assigned", treatment_type: "surgical", notes: null, emergency_id: null, admitted_at: DAY_10_AGO, assigned_at: DAY_9_AGO, discharged_at: null, updated_at: DAY_2_AGO, name: "Jane Smith", age: 42, gender: "Female", diagnosis: "Post-surgical recovery", severity: "medium", bed_number: "B115" },
  { id: 3, hospital_id: 1, bed_group_id: 3, ward_type: "General", status: "in_treatment", treatment_type: "general", notes: null, emergency_id: null, admitted_at: DAY_7_AGO, assigned_at: DAY_5_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "Robert Johnson", age: 58, gender: "Male", diagnosis: "Pneumonia", severity: "medium", bed_number: "C128" },
  { id: 4, hospital_id: 1, bed_group_id: 1, ward_type: "ICU", status: "in_treatment", treatment_type: "emergency", notes: "Critical care needed", emergency_id: 1, admitted_at: DAY_5_AGO, assigned_at: DAY_4_AGO, discharged_at: null, updated_at: BASE_DATE, name: "Maria Garcia", age: 71, gender: "Female", diagnosis: "Sepsis", severity: "critical", bed_number: "A105" },
  { id: 5, hospital_id: 1, bed_group_id: 2, ward_type: "HDU", status: "admitted", treatment_type: "intensive", notes: null, emergency_id: 5, admitted_at: DAY_3_AGO, assigned_at: DAY_2_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "David Wilson", age: 55, gender: "Male", diagnosis: "Diabetic complications", severity: "high", bed_number: "B120" },
  { id: 6, hospital_id: 1, bed_group_id: 3, ward_type: "General", status: "in_treatment", treatment_type: "general", notes: null, emergency_id: null, admitted_at: DAY_8_AGO, assigned_at: DAY_7_AGO, discharged_at: null, updated_at: DAY_2_AGO, name: "Sarah Brown", age: 34, gender: "Female", diagnosis: "Acute respiratory infection", severity: "low", bed_number: "C132" },
  { id: 7, hospital_id: 1, bed_group_id: 1, ward_type: "ICU", status: "in_treatment", treatment_type: "intensive", notes: null, emergency_id: 4, admitted_at: DAY_12_AGO, assigned_at: DAY_10_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "Michael Davis", age: 68, gender: "Male", diagnosis: "Stroke recovery", severity: "high", bed_number: "A108" },
  { id: 8, hospital_id: 1, bed_group_id: 2, ward_type: "HDU", status: "assigned", treatment_type: "surgical", notes: null, emergency_id: null, admitted_at: DAY_4_AGO, assigned_at: DAY_3_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "Emily Martinez", age: 29, gender: "Female", diagnosis: "Post-surgical recovery", severity: "medium", bed_number: "B125" },
  { id: 9, hospital_id: 1, bed_group_id: 3, ward_type: "General", status: "in_treatment", treatment_type: "general", notes: null, emergency_id: null, admitted_at: DAY_9_AGO, assigned_at: DAY_8_AGO, discharged_at: null, updated_at: DAY_2_AGO, name: "James Anderson", age: 47, gender: "Male", diagnosis: "Kidney failure", severity: "high", bed_number: "C140" },
  { id: 10, hospital_id: 1, bed_group_id: 3, ward_type: "General", status: "admitted", treatment_type: "general", notes: null, emergency_id: 3, admitted_at: DAY_2_AGO, assigned_at: DAY_1_AGO, discharged_at: null, updated_at: BASE_DATE, name: "Lisa Taylor", age: 52, gender: "Female", diagnosis: "Trauma - multiple injuries", severity: "medium", bed_number: "C145" },
  { id: 11, hospital_id: 1, bed_group_id: 2, ward_type: "HDU", status: "in_treatment", treatment_type: "intensive", notes: null, emergency_id: null, admitted_at: DAY_7_AGO, assigned_at: DAY_5_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "William Thomas", age: 63, gender: "Male", diagnosis: "COVID-19", severity: "high", bed_number: "B130" },
  { id: 12, hospital_id: 1, bed_group_id: 3, ward_type: "General", status: "in_treatment", treatment_type: "general", notes: null, emergency_id: null, admitted_at: DAY_5_AGO, assigned_at: DAY_4_AGO, discharged_at: null, updated_at: DAY_2_AGO, name: "Jennifer Moore", age: 38, gender: "Female", diagnosis: "Acute respiratory infection", severity: "low", bed_number: "C148" },
  { id: 13, hospital_id: 1, bed_group_id: 1, ward_type: "ICU", status: "in_treatment", treatment_type: "emergency", notes: null, emergency_id: null, admitted_at: DAY_3_AGO, assigned_at: DAY_2_AGO, discharged_at: null, updated_at: BASE_DATE, name: "Richard Jackson", age: 75, gender: "Male", diagnosis: "Cardiac arrhythmia", severity: "critical", bed_number: "A112" },
  { id: 14, hospital_id: 1, bed_group_id: 2, ward_type: "HDU", status: "assigned", treatment_type: "surgical", notes: null, emergency_id: null, admitted_at: DAY_1_AGO, assigned_at: BASE_DATE, discharged_at: null, updated_at: BASE_DATE, name: "Patricia White", age: 44, gender: "Female", diagnosis: "Post-surgical recovery", severity: "medium", bed_number: "B135" },
  { id: 15, hospital_id: 1, bed_group_id: 3, ward_type: "General", status: "admitted", treatment_type: "general", notes: null, emergency_id: 6, admitted_at: DAY_7_AGO, assigned_at: DAY_5_AGO, discharged_at: null, updated_at: DAY_1_AGO, name: "Charles Harris", age: 56, gender: "Male", diagnosis: "Pneumonia", severity: "medium", bed_number: "C150" },
];

export const mockPatientList: PatientList = {
  items: mockPatients,
  total: mockPatients.length,
};

// ============================================================================
// Mock Emergency Data (Static)
// ============================================================================

export const mockEmergencies: EmergencyCase[] = [
  { id: 1, severity: "critical", status: "created", hospital_id: null, bed_group_id: null, created_at: BASE_DATE, assigned_at: null, resolved_at: null, notes: "MVA - multiple trauma" },
  { id: 2, severity: "high", status: "assigned", hospital_id: 1, bed_group_id: 1, created_at: DAY_1_AGO, assigned_at: BASE_DATE, resolved_at: null, notes: "Cardiac arrest" },
  { id: 3, severity: "normal", status: "assigned", hospital_id: 2, bed_group_id: 2, created_at: DAY_2_AGO, assigned_at: DAY_1_AGO, resolved_at: null, notes: "Fractured limb" },
  { id: 4, severity: "critical", status: "resolved", hospital_id: 1, bed_group_id: 1, created_at: DAY_5_AGO, assigned_at: DAY_4_AGO, resolved_at: DAY_2_AGO, notes: "Stroke" },
  { id: 5, severity: "high", status: "created", hospital_id: null, bed_group_id: null, created_at: BASE_DATE, assigned_at: null, resolved_at: null, notes: "Severe allergic reaction" },
  { id: 6, severity: "normal", status: "resolved", hospital_id: 3, bed_group_id: 3, created_at: DAY_7_AGO, assigned_at: DAY_5_AGO, resolved_at: DAY_3_AGO, notes: "Minor injuries" },
];

export const mockHospitalLoads: HospitalLoad[] = [
  { hospital_id: 1, hospital_name: "City General Hospital", city: "Metro City", status: "active", icu_available: 8, icu_total: 30, hdu_available: 7, hdu_total: 45, general_available: 38, general_total: 150, overall_occupancy_rate: 76 },
  { hospital_id: 2, hospital_name: "Metro Medical Center", city: "Metro City", status: "active", icu_available: 7, icu_total: 35, hdu_available: 8, hdu_total: 50, general_available: 35, general_total: 180, overall_occupancy_rate: 81 },
  { hospital_id: 3, hospital_name: "Green Valley Hospital", city: "Green Valley", status: "active", icu_available: 7, icu_total: 25, hdu_available: 10, hdu_total: 40, general_available: 35, general_total: 120, overall_occupancy_rate: 72 },
  { hospital_id: 4, hospital_name: "Sunrise Healthcare", city: "Sunrise District", status: "active", icu_available: 4, icu_total: 28, hdu_available: 7, hdu_total: 42, general_available: 42, general_total: 140, overall_occupancy_rate: 75 },
  { hospital_id: 5, hospital_name: "Apollo Healthcare", city: "Central District", status: "active", icu_available: 6, icu_total: 32, hdu_available: 8, hdu_total: 48, general_available: 32, general_total: 160, overall_occupancy_rate: 81 },
  { hospital_id: 6, hospital_name: "Unity Medical Center", city: "Metro City", status: "active", icu_available: 9, icu_total: 30, hdu_available: 13, hdu_total: 45, general_available: 43, general_total: 145, overall_occupancy_rate: 70 },
  { hospital_id: 8, hospital_name: "Central District Hospital", city: "Central District", status: "active", icu_available: 8, icu_total: 40, hdu_available: 10, hdu_total: 55, general_available: 41, general_total: 205, overall_occupancy_rate: 80 },
];

export const mockResponseMetrics: ResponseMetrics = {
  total_emergencies: 156,
  resolved_count: 142,
  pending_count: 14,
  avg_response_time_minutes: 8.3,
  by_severity: [
    { severity: "critical", count: 23, avg_response_minutes: 4.2 },
    { severity: "high", count: 58, avg_response_minutes: 7.1 },
    { severity: "normal", count: 75, avg_response_minutes: 12.5 },
  ],
};

// ============================================================================
// Mock Disease/Outbreak Data
// ============================================================================

export const mockDiseaseTrends: DiseaseTrendResponse = {
  period_days: 30,
  total_emergencies: 156,
  emergency_by_severity: [
    { severity: "critical", count: 23, percentage: 14.7 },
    { severity: "high", count: 58, percentage: 37.2 },
    { severity: "normal", count: 75, percentage: 48.1 },
  ],
  total_admissions: 847,
  admissions_by_ward: [
    { ward_type: "ICU", admission_count: 89, active_patients: 45, discharge_count: 44 },
    { ward_type: "HDU", admission_count: 234, active_patients: 112, discharge_count: 122 },
    { ward_type: "General", admission_count: 524, active_patients: 286, discharge_count: 238 },
  ],
  avg_daily_emergencies: 5.2,
  avg_daily_admissions: 28.2,
  trend_indicator: "stable",
};

export const mockOutbreakRisk: OutbreakRiskResponse = {
  risk_level: "moderate",
  confidence: 0.78,
  factors: [
    { factor: "ICU Occupancy Rate", value: 85, threshold: 80, exceeds: true, severity: "warning" },
    { factor: "Respiratory Cases", value: 45, threshold: 50, exceeds: false, severity: "normal" },
    { factor: "Emergency Surge", value: 12, threshold: 15, exceeds: false, severity: "normal" },
    { factor: "Seasonal Index", value: 0.72, threshold: 0.8, exceeds: false, severity: "normal" },
  ],
  recommendations: [
    "Increase respiratory infection surveillance",
    "Prepare additional isolation capacity",
    "Stock up on flu medications",
    "Alert staff to watch for cluster patterns",
  ],
  assessed_at: BASE_DATE,
};

// ============================================================================
// Mock Notifications
// ============================================================================

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    title: "High Occupancy Alert",
    message: "ICU occupancy at City General Hospital has reached 90%",
    severity: "warning",
    recipient_role: "hospital_admin",
    recipient_hospital_id: 1,
    read_at: null,
    created_at: BASE_DATE,
    action_url: "/hospital-admin/beds",
  },
  {
    id: "notif-2",
    title: "Waste Pickup Scheduled",
    message: "Waste pickup scheduled for tomorrow at 10:00 AM",
    severity: "info",
    recipient_role: "hospital_admin",
    recipient_hospital_id: 1,
    read_at: null,
    created_at: DAY_1_AGO,
    action_url: "/hospital-admin/waste",
  },
  {
    id: "notif-3",
    title: "New Emergency Case",
    message: "Critical emergency case #5 requires immediate attention",
    severity: "critical",
    recipient_role: "emergency_service",
    recipient_hospital_id: null,
    read_at: null,
    created_at: BASE_DATE,
    action_url: "/emergency",
  },
  {
    id: "notif-4",
    title: "System Maintenance",
    message: "Scheduled maintenance window: Sunday 2:00 AM - 4:00 AM",
    severity: "info",
    recipient_role: "super_admin",
    recipient_hospital_id: null,
    read_at: DAY_1_AGO,
    created_at: DAY_2_AGO,
    action_url: null,
  },
  {
    id: "notif-5",
    title: "Disease Trend Alert",
    message: "Respiratory infections showing 24% increase over last week",
    severity: "warning",
    recipient_role: "super_admin",
    recipient_hospital_id: null,
    read_at: BASE_DATE,
    created_at: DAY_1_AGO,
    action_url: "/super-admin",
  },
];

// ============================================================================
// Demo Mode Flag & Helpers
// ============================================================================

export const DEMO_MODE = true;

/**
 * Simulate API delay for realistic demo experience
 */
export const simulateDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrap an API call with mock fallback
 */
export async function withMockFallback<T>(
  apiCall: () => Promise<T>,
  mockData: T,
  delayMs: number = 300
): Promise<T> {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.log('[Demo Mode] Using mock data due to API error:', error);
    await simulateDelay(delayMs);
    return mockData;
  }
}
