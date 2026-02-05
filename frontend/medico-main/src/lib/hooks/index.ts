/**
 * React Query Hooks Index
 * 
 * Re-exports all hooks for convenient imports.
 */

// Super Admin hooks
export {
  superAdminKeys,
  useBedSummary,
  useDiseaseTrends,
  useOutbreakRisk,
  useCreateHospital,
  useUpdateHospital,
  useSendNotice,
} from './use-super-admin';

// Hospital Admin hooks
export {
  hospitalAdminKeys,
  useWardStatus,
  useWastePrediction,
  useWasteComparison,
  useUpdateWardCapacity,
  useRequestPickup,
} from './use-hospital-admin';

// Medical Staff hooks
export {
  medicalStaffKeys,
  usePatients,
  usePatient,
  useAdmitPatient,
  useAssignBed,
  useTransferPatient,
  useDischargePatient,
  useUpdateTreatment,
  useReportWaste,
} from './use-medical-staff';

// Waste Team hooks
export {
  wasteTeamKeys,
  usePickupRequests,
  usePickupRequest,
  useDisposalLogs,
  useCollectWaste,
  useDisposeWaste,
  useRecordPayment,
} from './use-waste-team';

// WebSocket hook
export {
  useWebSocket,
  WebSocketProvider,
  useWebSocketContext,
  type WebSocketStatus,
  type WebSocketMessage,
} from './use-websocket';
