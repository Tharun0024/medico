/**
 * Waste Team API Service
 * 
 * API bindings for Waste Management Team dashboard operations.
 * Endpoints: /api/waste/*
 * Includes mock data fallback for demo mode.
 */

import { apiClient, withMockFallback } from './client';
import { mockPickupRequests } from './mock-data';
import type {
  PickupRequestList,
  PickupRequestView,
  CollectRequest,
  CollectResponse,
  DisposeRequest,
  DisposeResponse,
  PaymentRequest,
  PaymentResponse,
  DisposalLogList,
  WasteRequestStatus,
} from './types';

const BASE_PATH = '/api/waste';

export const wasteTeamApi = {
  // ============================================================================
  // Pickup Requests
  // ============================================================================
  
  /**
   * List all pickup requests with optional filters
   */
  listRequests: (options?: {
    status?: WasteRequestStatus;
    hospitalId?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.hospitalId) params.set('hospital_id', String(options.hospitalId));
    
    const queryString = params.toString();
    
    // Filter mock data
    let filtered = [...mockPickupRequests];
    if (options?.status) {
      filtered = filtered.filter(r => r.status === options.status);
    }
    if (options?.hospitalId) {
      filtered = filtered.filter(r => r.hospital_id === options.hospitalId);
    }
    
    return withMockFallback(
      () => apiClient.get<PickupRequestList>(
        `${BASE_PATH}/requests${queryString ? `?${queryString}` : ''}`
      ),
      { items: filtered, total: filtered.length }
    );
  },
  
  /**
   * Get single request details
   */
  getRequest: (requestId: string) =>
    withMockFallback(
      () => apiClient.get<PickupRequestView>(`${BASE_PATH}/requests/${requestId}`),
      mockPickupRequests.find(r => r.request_id === requestId) || mockPickupRequests[0]
    ),

  // ============================================================================
  // Collection Workflow
  // ============================================================================
  
  /**
   * Mark waste as collected
   */
  collectWaste: (requestId: string, data: CollectRequest) =>
    withMockFallback(
      () => apiClient.post<CollectResponse>(`${BASE_PATH}/collect?request_id=${requestId}`, data),
      {
        request_id: requestId,
        status: 'collected',
        collected_kg: data.collected_kg,
        collected_by: data.collected_by || 'Demo User',
        collected_at: new Date().toISOString(),
        message: 'Waste collected successfully',
      }
    ),

  // ============================================================================
  // Disposal Workflow
  // ============================================================================
  
  /**
   * Mark waste as disposed
   */
  disposeWaste: (requestId: string, data: DisposeRequest) =>
    withMockFallback(
      () => apiClient.post<DisposeResponse>(`${BASE_PATH}/dispose?request_id=${requestId}`, data),
      {
        request_id: requestId,
        status: 'disposed',
        disposal_method: data.method,
        disposed_kg: data.disposed_kg,
        disposed_by: data.disposed_by || 'Demo User',
        disposal_facility: data.facility || 'Central Disposal Facility',
        disposed_at: new Date().toISOString(),
        message: 'Waste disposed successfully',
      }
    ),

  // ============================================================================
  // Payment
  // ============================================================================
  
  /**
   * Record payment for disposal
   */
  recordPayment: (requestId: string, data: PaymentRequest) =>
    withMockFallback(
      () => apiClient.post<PaymentResponse>(`${BASE_PATH}/payment?request_id=${requestId}`, data),
      {
        request_id: requestId,
        status: 'paid',
        amount: data.amount,
        payment_reference: data.reference || `PAY-${Date.now()}`,
        paid_at: new Date().toISOString(),
        message: 'Payment recorded successfully',
      }
    ),

  // ============================================================================
  // Audit Logs
  // ============================================================================
  
  /**
   * Get disposal logs (audit trail)
   */
  getDisposalLogs: (options?: {
    hospitalId?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const params = new URLSearchParams();
    if (options?.hospitalId) params.set('hospital_id', String(options.hospitalId));
    if (options?.startDate) params.set('start_date', options.startDate);
    if (options?.endDate) params.set('end_date', options.endDate);
    
    const queryString = params.toString();
    
    // Generate mock logs from completed requests
    const mockLogs = mockPickupRequests
      .filter(r => r.status === 'paid' || r.status === 'disposed')
      .map(r => ({
        log_id: `LOG-${r.request_id}`,
        request_id: r.request_id,
        hospital_id: r.hospital_id,
        hospital_name: r.hospital_name,
        collected_kg: r.collected_kg || 0,
        disposed_kg: r.disposed_kg || 0,
        disposal_method: r.disposal_method || 'incineration',
        disposed_at: r.disposed_at || new Date().toISOString(),
        disposed_by: r.disposed_by || 'System',
      }));
    
    return withMockFallback(
      () => apiClient.get<DisposalLogList>(
        `${BASE_PATH}/logs${queryString ? `?${queryString}` : ''}`
      ),
      { items: mockLogs, total: mockLogs.length }
    );
  },
};

export default wasteTeamApi;
