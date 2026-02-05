/**
 * React Query Hooks for Medical Staff API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { medicalStaffApi } from '@/lib/api';
import type {
  PatientAdmitRequest,
  BedAssignRequest,
  TransferRequest,
  DischargeRequest,
  TreatmentUpdateRequest,
  WasteReportRequest,
  PatientStatus,
  WardType,
} from '@/lib/api/types';
import { toast } from 'sonner';

export const medicalStaffKeys = {
  all: ['medicalStaff'] as const,
  patients: (options?: { status?: PatientStatus; ward?: WardType }) =>
    [...medicalStaffKeys.all, 'patients', options] as const,
  patient: (id: number) => [...medicalStaffKeys.all, 'patient', id] as const,
};

/**
 * Hook to fetch patients list
 */
export function usePatients(options?: {
  status?: PatientStatus;
  ward?: WardType;
  skip?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: medicalStaffKeys.patients(options),
    queryFn: () => medicalStaffApi.listPatients(options),
  });
}

/**
 * Hook to fetch single patient
 */
export function usePatient(patientId: number) {
  return useQuery({
    queryKey: medicalStaffKeys.patient(patientId),
    queryFn: () => medicalStaffApi.getPatient(patientId),
    enabled: !!patientId,
  });
}

/**
 * Hook to admit a patient
 */
export function useAdmitPatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: PatientAdmitRequest) => medicalStaffApi.admitPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patients() });
      toast.success('Patient admitted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to admit patient', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to assign bed to patient
 */
export function useAssignBed() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: number; data: BedAssignRequest }) =>
      medicalStaffApi.assignBed(patientId, data),
    onSuccess: (response: { patient_id: number; ward_type: string }) => {
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patients() });
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patient(response.patient_id) });
      toast.success('Bed assigned', {
        description: `Patient assigned to ${response.ward_type} ward`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to assign bed', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to transfer patient
 */
export function useTransferPatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: number; data: TransferRequest }) =>
      medicalStaffApi.transferPatient(patientId, data),
    onSuccess: (response: { patient_id: number; previous_ward_type: string; new_ward_type: string }) => {
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patients() });
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patient(response.patient_id) });
      toast.success('Patient transferred', {
        description: `Transferred from ${response.previous_ward_type} to ${response.new_ward_type}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to transfer patient', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to discharge patient
 */
export function useDischargePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: number; data?: DischargeRequest }) =>
      medicalStaffApi.dischargePatient(patientId, data),
    onSuccess: (response: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patients() });
      toast.success('Patient discharged', {
        description: response.message,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to discharge patient', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to update treatment
 */
export function useUpdateTreatment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ patientId, data }: { patientId: number; data: TreatmentUpdateRequest }) =>
      medicalStaffApi.updateTreatment(patientId, data),
    onSuccess: (response: { patient_id: number; new_treatment: string }) => {
      queryClient.invalidateQueries({ queryKey: medicalStaffKeys.patient(response.patient_id) });
      toast.success('Treatment updated', {
        description: `Changed to ${response.new_treatment}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update treatment', {
        description: error.message,
      });
    },
  });
}

/**
 * Hook to report waste
 */
export function useReportWaste() {
  return useMutation({
    mutationFn: (data: WasteReportRequest) => medicalStaffApi.reportWaste(data),
    onSuccess: (response: { total_hospital_waste_kg: number }) => {
      toast.success('Waste reported', {
        description: `Total hospital waste: ${response.total_hospital_waste_kg}kg`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to report waste', {
        description: error.message,
      });
    },
  });
}
