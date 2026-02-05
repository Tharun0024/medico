/**
 * React Query Hooks for Waste Team API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wasteTeamApi } from '@/lib/api';
import type {
  CollectRequest,
  DisposeRequest,
  PaymentRequest,
  WasteRequestStatus,
} from '@/lib/api/types';
import { toast } from 'sonner';

export const wasteTeamKeys = {
  all: ['wasteTeam'] as const,
  requests: (options?: { status?: WasteRequestStatus; hospitalId?: number }) =>
    [...wasteTeamKeys.all, 'requests', options] as const,
  request: (id: string) => [...wasteTeamKeys.all, 'request', id] as const,
  logs: (options?: { hospitalId?: number; startDate?: string; endDate?: string }) =>
    [...wasteTeamKeys.all, 'logs', options] as const,
};

/**
 * Hook to fetch pickup requests
 */
export function usePickupRequests(options?: {
  status?: WasteRequestStatus;
  hospitalId?: number;
}) {
  return useQuery({
    queryKey: wasteTeamKeys.requests(options),
    queryFn: () => wasteTeamApi.listRequests(options),
    // Refresh every 30 seconds for real-time feel
    refetchInterval: 30 * 1000,
  });
}

/**
 * Hook to fetch single request
 */
export function usePickupRequest(requestId: string) {
  return useQuery({
    queryKey: wasteTeamKeys.request(requestId),
    queryFn: () => wasteTeamApi.getRequest(requestId),
    enabled: !!requestId,
  });
}

/**
 * Hook to fetch disposal logs
 */
export function useDisposalLogs(options?: {
  hospitalId?: number;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: wasteTeamKeys.logs(options),
    queryFn: () => wasteTeamApi.getDisposalLogs(options),
  });
}

/**
 * Hook to collect waste
 */
export function useCollectWaste() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: CollectRequest }) =>
      wasteTeamApi.collectWaste(requestId, data),
    onSuccess: (response: { request_id: string; collected_kg: number; hospital_name: string }) => {
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.requests() });
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.request(response.request_id) });
      toast.success('Waste collected', {
        description: `${response.collected_kg}kg collected from ${response.hospital_name}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to record collection', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to dispose waste
 */
export function useDisposeWaste() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: DisposeRequest }) =>
      wasteTeamApi.disposeWaste(requestId, data),
    onSuccess: (response: { request_id: string; disposed_kg: number; disposal_method: string }) => {
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.requests() });
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.request(response.request_id) });
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.logs() });
      toast.success('Waste disposed', {
        description: `${response.disposed_kg}kg disposed via ${response.disposal_method}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to record disposal', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to record payment
 */
export function useRecordPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ requestId, data }: { requestId: string; data: PaymentRequest }) =>
      wasteTeamApi.recordPayment(requestId, data),
    onSuccess: (response: { request_id: string; payment_amount: number; payment_reference: string }) => {
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.requests() });
      queryClient.invalidateQueries({ queryKey: wasteTeamKeys.request(response.request_id) });
      toast.success('Payment recorded', {
        description: `₹${response.payment_amount} received - Ref: ${response.payment_reference}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to record payment', {
        description: error.message,
      });
    },
  });
}
