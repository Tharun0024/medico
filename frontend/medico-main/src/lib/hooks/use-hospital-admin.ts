/**
 * React Query Hooks for Hospital Admin API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hospitalAdminApi } from '@/lib/api';
import type {
  WardCapacityUpdateRequest,
  PickupRequestCreate,
} from '@/lib/api/types';
import { toast } from 'sonner';

export const hospitalAdminKeys = {
  all: ['hospitalAdmin'] as const,
  wardStatus: () => [...hospitalAdminKeys.all, 'wardStatus'] as const,
  wastePrediction: () => [...hospitalAdminKeys.all, 'wastePrediction'] as const,
  wasteComparison: (days?: number) => [...hospitalAdminKeys.all, 'wasteComparison', days] as const,
  pickupHistory: () => [...hospitalAdminKeys.all, 'pickupHistory'] as const,
};

/**
 * Hook to fetch ward status
 */
export function useWardStatus() {
  return useQuery({
    queryKey: hospitalAdminKeys.wardStatus(),
    queryFn: () => hospitalAdminApi.getWardStatus(),
  });
}

/**
 * Hook to fetch waste prediction
 */
export function useWastePrediction() {
  return useQuery({
    queryKey: hospitalAdminKeys.wastePrediction(),
    queryFn: () => hospitalAdminApi.getWastePrediction(),
    // Refresh prediction every 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch waste comparison
 */
export function useWasteComparison(days?: number) {
  return useQuery({
    queryKey: hospitalAdminKeys.wasteComparison(days),
    queryFn: () => hospitalAdminApi.getWasteComparison(days),
  });
}

/**
 * Hook to update ward capacity
 */
export function useUpdateWardCapacity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: WardCapacityUpdateRequest) => hospitalAdminApi.updateWardCapacity(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hospitalAdminKeys.wardStatus() });
      toast.success('Ward capacity updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update ward capacity', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to request waste pickup
 */
export function useRequestPickup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PickupRequestCreate) => hospitalAdminApi.requestPickup(data),
    onSuccess: (response: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: hospitalAdminKeys.pickupHistory() });
      queryClient.invalidateQueries({ queryKey: hospitalAdminKeys.wastePrediction() });
      toast.success('Pickup requested', {
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to request pickup', {
        description: error.message,
      });
    },
  });
}
