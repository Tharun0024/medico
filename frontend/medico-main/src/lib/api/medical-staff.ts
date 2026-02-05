/**
 * Medical Staff API Service
 * 
 * API bindings for Medical Staff dashboard operations.
 * Endpoints: /api/medical/*
 * Includes mock data fallback for demo mode.
 */

import { apiClient, withMockFallback } from './client';
import {
  mockPatients,
  mockPatientList,
  mockWastePrediction,
} from './mock-data';
import type {
  Patient,
  PatientList,
  PatientAdmitRequest,
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
  PatientStatus,
  WardType,
} from './types';

const BASE_PATH = '/api/medical';

export const medicalStaffApi = {
  // ============================================================================
  // Patient Management
  // ============================================================================
  
  /**
   * Admit a new patient
   */
  admitPatient: (data: PatientAdmitRequest) =>
    withMockFallback(
      () => apiClient.post<Patient>(`${BASE_PATH}/patient`, data),
      {
        id: mockPatients.length + 1,
        hospital_id: 1,
        bed_group_id: null,
        ward_type: data.ward_type || null,
        status: 'admitted',
        treatment_type: data.treatment_type || null,
        notes: data.notes || null,
        emergency_id: data.emergency_id || null,
        admitted_at: new Date().toISOString(),
        assigned_at: null,
        discharged_at: null,
        updated_at: new Date().toISOString(),
        name: data.name || 'New Patient',
        age: data.age || 0,
        gender: data.gender || 'Unknown',
        diagnosis: data.diagnosis || '',
        severity: data.severity || 'medium',
      }
    ),
  
  /**
   * List patients with optional filters
   */
  listPatients: (options?: {
    status?: PatientStatus;
    ward?: WardType;
    skip?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.ward) params.set('ward', options.ward);
    if (options?.skip !== undefined) params.set('skip', String(options.skip));
    if (options?.limit !== undefined) params.set('limit', String(options.limit));
    
    const queryString = params.toString();
    
    // Filter mock data based on options
    let filteredPatients = [...mockPatients];
    if (options?.status) {
      filteredPatients = filteredPatients.filter(p => p.status === options.status);
    }
    if (options?.ward) {
      filteredPatients = filteredPatients.filter(p => p.ward_type?.toLowerCase() === options.ward?.toLowerCase());
    }
    
    return withMockFallback(
      () => apiClient.get<PatientList>(
        `${BASE_PATH}/patients${queryString ? `?${queryString}` : ''}`
      ),
      { items: filteredPatients, total: filteredPatients.length }
    );
  },
  
  /**
   * Get patient by ID
   */
  getPatient: (patientId: number) =>
    withMockFallback(
      () => apiClient.get<Patient>(`${BASE_PATH}/patient/${patientId}`),
      mockPatients.find(p => p.id === patientId) || mockPatients[0]
    ),

  // ============================================================================
  // Bed Assignment
  // ============================================================================
  
  /**
   * Assign patient to a bed
   */
  assignBed: (patientId: number, data: BedAssignRequest) =>
    withMockFallback(
      () => apiClient.post<BedAssignResponse>(`${BASE_PATH}/patient/${patientId}/bed`, data),
      {
        patient_id: patientId,
        hospital_id: 1,
        bed_group_id: data.bed_group_id || 1,
        ward_type: 'General',
        status: 'assigned',
        assigned_at: new Date().toISOString(),
        message: 'Patient assigned to bed successfully',
      }
    ),
  
  /**
   * Transfer patient to different ward/bed
   */
  transferPatient: (patientId: number, data: TransferRequest) =>
    withMockFallback(
      () => apiClient.post<TransferResponse>(`${BASE_PATH}/patient/${patientId}/transfer`, data),
      {
        patient_id: patientId,
        previous_bed_group_id: 1,
        previous_ward_type: 'General',
        new_bed_group_id: data.new_bed_group_id,
        new_ward_type: 'ICU',
        transferred_at: new Date().toISOString(),
        message: 'Patient transferred successfully',
      }
    ),
  
  /**
   * Discharge patient
   */
  dischargePatient: (patientId: number, data?: DischargeRequest) =>
    withMockFallback(
      () => apiClient.post<DischargeResponse>(`${BASE_PATH}/patient/${patientId}/discharge`, data),
      {
        patient_id: patientId,
        hospital_id: 1,
        released_bed_group_id: 1,
        released_ward_type: 'General',
        discharged_at: new Date().toISOString(),
        message: 'Patient discharged successfully',
      }
    ),

  // ============================================================================
  // Treatment
  // ============================================================================
  
  /**
   * Update patient treatment type
   */
  updateTreatment: (patientId: number, data: TreatmentUpdateRequest) =>
    withMockFallback(
      () => apiClient.patch<TreatmentUpdateResponse>(
        `${BASE_PATH}/patient/${patientId}/treatment`,
        data
      ),
      {
        patient_id: patientId,
        previous_treatment: 'general',
        new_treatment: data.treatment_type,
        updated_at: new Date().toISOString(),
        message: 'Treatment updated successfully',
      }
    ),

  // ============================================================================
  // Waste Reporting
  // ============================================================================
  
  /**
   * Submit waste report
   */
  reportWaste: (data: WasteReportRequest) =>
    withMockFallback(
      () => apiClient.post<WasteReportResponse>(`${BASE_PATH}/waste/report`, data),
      {
        report_id: `WR-${Date.now()}`,
        hospital_id: 1,
        waste_kg: data.waste_kg,
        category: data.category,
        reported_at: new Date().toISOString(),
        message: 'Waste report submitted successfully',
      }
    ),
  
  /**
   * Trigger waste prediction refresh
   */
  refreshWastePrediction: () =>
    withMockFallback(
      () => apiClient.post<{ message: string }>(`${BASE_PATH}/waste/predict`),
      { message: 'Waste prediction refreshed' }
    ),
};

export default medicalStaffApi;
