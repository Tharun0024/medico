/**
 * Hospital Admin API Service
 * 
 * API bindings for Hospital Admin dashboard operations.
 * Endpoints: /api/hospital/*
 * Includes mock data fallback for demo mode.
 */

import { apiClient, withMockFallback } from './client';
import {
  mockWardStatus,
  mockWastePrediction,
  mockWasteComparison,
  mockPickupRequests,
} from './mock-data';
import type {
  WardCapacityUpdateRequest,
  WardCapacityUpdateResponse,
  WastePrediction,
  WasteComparison,
  PickupRequestCreate,
  PickupRequestResponse,
} from './types';

const BASE_PATH = '/api/hospital';

export const hospitalAdminApi = {
  // ============================================================================
  // Ward Capacity Management
  // ============================================================================
  
  /**
   * Update ward capacities
   */
  updateWardCapacity: (data: WardCapacityUpdateRequest) =>
    withMockFallback(
      () => apiClient.patch<WardCapacityUpdateResponse>(`${BASE_PATH}/wards`, data),
      { ...mockWardStatus, message: "Ward capacity updated successfully" }
    ),
  
  /**
   * Get current ward status for the hospital
   */
  getWardStatus: () =>
    withMockFallback(
      () => apiClient.get<WardCapacityUpdateResponse>(`${BASE_PATH}/wards`),
      mockWardStatus
    ),

  // ============================================================================
  // Waste Prediction
  // ============================================================================
  
  /**
   * Get waste prediction for the hospital
   */
  getWastePrediction: () =>
    withMockFallback(
      () => apiClient.get<WastePrediction>(`${BASE_PATH}/waste/prediction`),
      mockWastePrediction
    ),
  
  /**
   * Get actual vs predicted waste comparison
   */
  getWasteComparison: (days?: number) => {
    const params = days ? `?days=${days}` : '';
    return withMockFallback(
      () => apiClient.get<WasteComparison>(`${BASE_PATH}/waste/comparison${params}`),
      mockWasteComparison
    );
  },

  // ============================================================================
  // Pickup Requests
  // ============================================================================
  
  /**
   * Request waste pickup
   */
  requestPickup: (data: PickupRequestCreate) =>
    withMockFallback(
      () => apiClient.post<PickupRequestResponse>(`${BASE_PATH}/waste/request-pickup`, data),
      {
        request_id: `REQ-${Date.now()}`,
        hospital_id: 1,
        hospital_name: "City General Hospital",
        current_waste_kg: mockWastePrediction.current_waste_kg,
        urgency: data.urgency || "normal",
        status: "requested",
        requested_at: new Date().toISOString(),
        message: "Pickup request submitted successfully",
      }
    ),
  
  /**
   * Get pickup request history (uses waste team endpoint)
   */
  getPickupHistory: () =>
    withMockFallback(
      () => apiClient.get<PickupRequestResponse[]>(`/api/waste/requests`),
      mockPickupRequests.map(r => ({
        request_id: r.request_id,
        hospital_id: r.hospital_id,
        hospital_name: r.hospital_name,
        current_waste_kg: r.reported_waste_kg,
        urgency: r.urgency,
        status: r.status,
        requested_at: r.requested_at,
        message: "Request retrieved",
      }))
    ),
};

export default hospitalAdminApi;
