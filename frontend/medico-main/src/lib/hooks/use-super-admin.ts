/**
 * React Query Hooks for Super Admin API
 * 
 * Provides data fetching hooks with caching, loading states, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '@/lib/api';
import type {
  HospitalCreateRequest,
  HospitalUpdateRequest,
  AdminNoticeRequest,
} from '@/lib/api/types';
import { toast } from 'sonner';

// Query keys for cache management
export const superAdminKeys = {
  all: ['superAdmin'] as const,
  hospitals: () => [...superAdminKeys.all, 'hospitals'] as const,
  bedSummary: () => [...superAdminKeys.all, 'bedSummary'] as const,
  diseaseTrends: (days?: number) => [...superAdminKeys.all, 'diseaseTrends', days] as const,
  outbreakRisk: () => [...superAdminKeys.all, 'outbreakRisk'] as const,
};

/**
 * Hook to fetch bed summary
 */
export function useBedSummary() {
  return useQuery({
    queryKey: superAdminKeys.bedSummary(),
    queryFn: () => superAdminApi.getBedSummary(),
  });
}

/**
 * Hook to fetch disease trends
 */
export function useDiseaseTrends(days?: number) {
  return useQuery({
    queryKey: superAdminKeys.diseaseTrends(days),
    queryFn: () => superAdminApi.getDiseaseTrends(days),
  });
}

/**
 * Hook to fetch outbreak risk
 */
export function useOutbreakRisk() {
  return useQuery({
    queryKey: superAdminKeys.outbreakRisk(),
    queryFn: () => superAdminApi.getOutbreakRisk(),
    // Check outbreak risk every minute
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook to create a new hospital
 */
export function useCreateHospital() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: HospitalCreateRequest) => superAdminApi.createHospital(data),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: superAdminKeys.hospitals() });
      queryClient.invalidateQueries({ queryKey: superAdminKeys.bedSummary() });
      toast.success('Hospital created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create hospital', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to update a hospital
 */
export function useUpdateHospital() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ hospitalId, data }: { hospitalId: number; data: HospitalUpdateRequest }) =>
      superAdminApi.updateHospital(hospitalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: superAdminKeys.hospitals() });
      queryClient.invalidateQueries({ queryKey: superAdminKeys.bedSummary() });
      toast.success('Hospital updated successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to update hospital', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to send admin notice
 */
export function useSendNotice() {
  return useMutation({
    mutationFn: (data: AdminNoticeRequest) => superAdminApi.sendNotice(data),
    onSuccess: (response: { target_hospitals: number[] }) => {
      toast.success('Notice sent successfully', {
        description: `Sent to ${response.target_hospitals.length} hospitals`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to send notice', {
        description: error.message,
      });
    },
  });
}
