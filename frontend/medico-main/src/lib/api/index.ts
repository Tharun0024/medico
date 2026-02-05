/**
 * API Module Index
 * 
 * Re-exports all API services for convenient imports.
 */

// Core client
export { apiClient, getStoredAuth, setStoredAuth, clearStoredAuth, withMockFallback, DEMO_MODE } from './client';
export type { ApiError, ApiRequestOptions } from './client';

// Type definitions
export * from './types';

// Mock data for demo mode
export * from './mock-data';

// API Services
export { superAdminApi } from './super-admin';
export { hospitalAdminApi } from './hospital-admin';
export { medicalStaffApi } from './medical-staff';
export { wasteTeamApi } from './waste-team';
export { emergencyApi } from './emergency';
export { notificationsApi } from './notifications';
