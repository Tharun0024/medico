/**
 * Emergency Services API
 * 
 * API bindings for Emergency Service and Control Room dashboard operations.
 * Endpoints: /api/emergencies/*, /api/emergency/*, /api/control/*
 * Includes mock data fallback for demo mode.
 */

import { apiClient, withMockFallback } from './client';
import {
  mockEmergencies,
  mockHospitalLoads,
  mockResponseMetrics,
} from './mock-data';
import type {
  EmergencyCase,
  EmergencyCreateRequest,
  EmergencyAssignRequest,
  HospitalLoad,
  ResponseMetrics,
  EmergencySeverity,
  EmergencyStatus,
} from './types';

// Emergency CRUD endpoints (plural)
const EMERGENCIES_PATH = '/api/emergencies';

// Emergency dashboard/info endpoints (singular)
const EMERGENCY_PATH = '/api/emergency';

// Control Room endpoints  
const CONTROL_PATH = '/api/control';

export const emergencyApi = {
  // ============================================================================
  // Emergency Cases (Emergency Service)
  // ============================================================================
  
  /**
   * Create a new emergency case
   */
  createEmergency: (data: EmergencyCreateRequest) =>
    withMockFallback(
      () => apiClient.post<EmergencyCase>(`${EMERGENCIES_PATH}`, data),
      {
        id: mockEmergencies.length + 1,
        severity: data.severity,
        status: 'created',
        hospital_id: null,
        bed_group_id: null,
        created_at: new Date().toISOString(),
        assigned_at: null,
        resolved_at: null,
        notes: data.notes || null,
      }
    ),
  
  /**
   * List emergencies with optional filters
   */
  listEmergencies: (options?: {
    severity?: EmergencySeverity;
    status?: EmergencyStatus;
    hospitalId?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.severity) params.set('severity', options.severity);
    if (options?.status) params.set('status', options.status);
    if (options?.hospitalId) params.set('hospital_id', String(options.hospitalId));
    
    const queryString = params.toString();
    
    // Filter mock data
    let filtered = [...mockEmergencies];
    if (options?.severity) {
      filtered = filtered.filter(e => e.severity === options.severity);
    }
    if (options?.status) {
      filtered = filtered.filter(e => e.status === options.status);
    }
    if (options?.hospitalId) {
      filtered = filtered.filter(e => e.hospital_id === options.hospitalId);
    }
    
    return withMockFallback(
      () => apiClient.get<{ items: EmergencyCase[]; total: number }>(
        `${EMERGENCIES_PATH}${queryString ? `?${queryString}` : ''}`
      ),
      { items: filtered, total: filtered.length }
    );
  },
  
  /**
   * Get emergency by ID
   */
  getEmergency: (emergencyId: number) =>
    withMockFallback(
      () => apiClient.get<EmergencyCase>(`${EMERGENCIES_PATH}/${emergencyId}`),
      mockEmergencies.find(e => e.id === emergencyId) || mockEmergencies[0]
    ),
  
  /**
   * Get hospital suggestions for emergency assignment
   * Uses severity to find candidate hospitals with capacity
   */
  getHospitalSuggestions: (severity: EmergencySeverity) =>
    withMockFallback(
      () => apiClient.get<HospitalLoad[]>(`${EMERGENCIES_PATH}/candidates/${severity}`),
      mockHospitalLoads.filter(h => {
        // Filter by capacity based on severity
        if (severity === 'critical') return h.icu_available > 0;
        if (severity === 'high') return h.hdu_available > 0 || h.icu_available > 0;
        return h.general_available > 0;
      })
    ),

  // ============================================================================
  // Control Room Operations
  // ============================================================================
  
  /**
   * Manual emergency assignment (Control Room only)
   */
  assignEmergency: (emergencyId: number, data: EmergencyAssignRequest) =>
    withMockFallback(
      () => apiClient.post<EmergencyCase>(`${CONTROL_PATH}/emergencies/${emergencyId}/assign-hospital`, data),
      {
        ...mockEmergencies.find(e => e.id === emergencyId) || mockEmergencies[0],
        status: 'assigned',
        hospital_id: data.hospital_id,
        bed_group_id: 1,
        assigned_at: new Date().toISOString(),
      }
    ),
  
  /**
   * Reassign emergency to different hospital
   */
  reassignEmergency: (emergencyId: number, data: EmergencyAssignRequest) =>
    withMockFallback(
      () => apiClient.post<EmergencyCase>(`${CONTROL_PATH}/emergencies/${emergencyId}/reassign`, data),
      {
        ...mockEmergencies.find(e => e.id === emergencyId) || mockEmergencies[0],
        hospital_id: data.hospital_id,
        assigned_at: new Date().toISOString(),
      }
    ),
  
  /**
   * Resolve emergency
   */
  resolveEmergency: (emergencyId: number) =>
    withMockFallback(
      () => apiClient.post<EmergencyCase>(`${EMERGENCIES_PATH}/${emergencyId}/resolve`),
      {
        ...mockEmergencies.find(e => e.id === emergencyId) || mockEmergencies[0],
        status: 'resolved',
        resolved_at: new Date().toISOString(),
      }
    ),
  
  /**
   * Get all hospital loads (for control room overview)
   */
  getHospitalLoads: () =>
    withMockFallback(
      () => apiClient.get<HospitalLoad[]>(`${CONTROL_PATH}/hospital-loads`),
      mockHospitalLoads
    ),
  
  /**
   * Get response metrics
   */
  getResponseMetrics: (days?: number) => {
    const params = days ? `?days=${days}` : '';
    return withMockFallback(
      () => apiClient.get<ResponseMetrics>(`${CONTROL_PATH}/metrics${params}`),
      mockResponseMetrics
    );
  },
};

export default emergencyApi;
