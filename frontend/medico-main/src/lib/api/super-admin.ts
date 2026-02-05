/**
 * Super Admin API Service
 * 
 * API bindings for Super Admin (Government) dashboard operations.
 * Endpoints: /api/admin/*
 * Includes mock data fallback for demo mode.
 */

import { apiClient, withMockFallback } from './client';
import {
  mockHospitals,
  mockDistrictBedSummary,
  mockDiseaseTrends,
  mockOutbreakRisk,
} from './mock-data';
import type {
  Hospital,
  HospitalCreateRequest,
  HospitalUpdateRequest,
  DistrictBedSummary,
  DiseaseTrendResponse,
  OutbreakRiskResponse,
  AdminNoticeRequest,
  AdminNoticeResponse,
} from './types';

const BASE_PATH = '/api/admin';

export const superAdminApi = {
  // ============================================================================
  // Hospital Management
  // ============================================================================
  
  /**
   * Create a new hospital
   */
  createHospital: (data: HospitalCreateRequest) =>
    withMockFallback(
      () => apiClient.post<Hospital>(`${BASE_PATH}/hospitals`, data),
      {
        id: mockHospitals.length + 1,
        name: data.name,
        city: data.city,
        status: data.status || 'active',
        created_at: new Date().toISOString(),
      }
    ),
  
  /**
   * Update hospital details
   */
  updateHospital: (hospitalId: number, data: HospitalUpdateRequest) =>
    withMockFallback(
      () => apiClient.patch<Hospital>(`${BASE_PATH}/hospitals/${hospitalId}`, data),
      {
        ...mockHospitals.find(h => h.id === hospitalId) || mockHospitals[0],
        ...data,
      }
    ),
  
  /**
   * Get all hospitals
   */
  getHospitals: () =>
    withMockFallback(
      () => apiClient.get<Hospital[]>(`${BASE_PATH}/hospitals`),
      mockHospitals
    ),

  // ============================================================================
  // District Analytics
  // ============================================================================
  
  /**
   * Get district-wide bed availability summary
   */
  getBedSummary: () =>
    withMockFallback(
      () => apiClient.get<DistrictBedSummary>(`${BASE_PATH}/bed-summary`),
      mockDistrictBedSummary
    ),
  
  /**
   * Get disease trends analysis
   */
  getDiseaseTrends: (days?: number) => {
    const params = days ? `?days=${days}` : '';
    return withMockFallback(
      () => apiClient.get<DiseaseTrendResponse>(`${BASE_PATH}/disease-trends${params}`),
      mockDiseaseTrends
    );
  },
  
  /**
   * Get outbreak risk assessment
   */
  getOutbreakRisk: () =>
    withMockFallback(
      () => apiClient.get<OutbreakRiskResponse>(`${BASE_PATH}/outbreak-risk`),
      mockOutbreakRisk
    ),

  // ============================================================================
  // Notices
  // ============================================================================
  
  /**
   * Send notice to hospitals
   */
  sendNotice: (data: AdminNoticeRequest) =>
    withMockFallback(
      () => apiClient.post<AdminNoticeResponse>(`${BASE_PATH}/notify`, data),
      {
        notice_id: `NOTICE-${Date.now()}`,
        title: data.title,
        message: data.message,
        severity: data.severity || 'info',
        target_hospitals: data.target_hospitals || [],
        sent_count: data.target_hospitals?.length || mockHospitals.length,
        sent_at: new Date().toISOString(),
      }
    ),
};

export default superAdminApi;
