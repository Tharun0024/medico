// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Store auth token for authenticated requests
let authToken: string | null = null;

export const setAuthToken = (token: string) => {
  authToken = token;
};

// Types matching FastAPI backend
export interface AmbulanceRegistration {
  ambulance_id: string;
  secret: string;
}

export interface AmbulanceInfo {
  id: string;
  plate_number: string;
  hospital_id: string;
}

export interface GPSData {
  lat: number;
  lng: number;
  speed_kmh: number;
  updated_at: string;
  route_name: string;
  route_index: number;
  is_running: boolean;
}

export interface SignalResponse {
  state: string;
  reason: string;
  distance_km: number;
  severity: string;
}

export interface CorridorSignal {
  signal_id: string;
  state: string;
  reason: string;
  distance_km: number;
}

export interface CorridorStatus {
  ambulance_id: string;
  hospital_id?: string;
  full_route: string[];
  active_corridor: string[];
  states: CorridorSignal[];
}

export interface SystemStatus {
  active_ambulances: string[];
  locked_resources: Record<string, string>;
  suppressed_ambulances: string[];
  log_preview: ConflictLog[];
}

export interface ConflictLog {
  resource: string;
  winner: string;
  losers?: string[];
  timestamp?: string;
}

// Traffic LLM types
export interface TrafficSnapshot {
  congestion_level: 'low' | 'medium' | 'high';
  incident: string | null;
  estimated_clearance_minutes: number;
  confidence: number;
  generated_at: string;
}

// Signal FSM states (matching backend)
export type SignalFSMState = 'NORMAL' | 'PREPARE_PRIORITY' | 'GREEN_FOR_AMBULANCE' | 'COOLDOWN';

// Dashboard signal info (from /dashboard/signals)
export interface DashboardSignalInfo {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state: string;  // FSM state: RED, GREEN, PREPARE_PRIORITY, etc
  is_priority: boolean;
  controlled_by: string | null;
  green_time_remaining: number | null;
}

// Legacy types for dashboard compatibility
export interface Ambulance {
  id: string;
  vehicle_number: string;
  driver_id?: string;
  current_lat?: number;
  current_lng?: number;
  state: 'AVAILABLE' | 'DISPATCHED' | 'HEADING_TO_ACCIDENT' | 'PATIENT_ONBOARD' | 'HEADING_TO_HOSPITAL' | 'COMPLETED' | 'OFFLINE';
  equipment_level: string;
  last_location_update?: string;
}

export interface Hospital {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  total_beds: number;
  available_beds: number;
  phone?: string;
  is_active: boolean;
}

export interface TrafficSignal {
  id: string;
  name: string;
  lat: number;
  lng: number;
  intersection_type: string;
  state: 'NORMAL' | 'GREEN_PRIORITY' | 'RESETTING';
  state_changed_at?: string;
  preempted_by_trip_id?: string;
}

export interface DashboardOverview {
  total_ambulances: number;
  available_ambulances: number;
  active_trips: number;
  completed_today: number;
  total_signals: number;
  preempted_signals: number;
}

export interface ActiveTripInfo {
  trip_id: string;
  ambulance_number: string;
  state: string;
  emergency_type?: string;
  current_lat?: number;
  current_lng?: number;
  ambulance_lat?: number;
  ambulance_lng?: number;
  accident_lat?: number;
  accident_lng?: number;
  hospital_lat?: number;
  hospital_lng?: number;
  eta_minutes?: number;
  destination: string;
}

// API Functions
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Add auth token if available
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

// Auth/Ambulance Registration APIs (matching FastAPI backend)
export const authAPI = {
  register: (ambulance_id: string, secret: string) =>
    fetchAPI<{ access_token: string; token_type: string }>('/amb/ambulance/register', {
      method: 'POST',
      body: JSON.stringify({ ambulance_id, secret }),
    }),
  getMe: () => fetchAPI<AmbulanceInfo>('/amb/ambulance/me'),
};

// GPS APIs (matching FastAPI backend)
export const gpsAPI = {
  start: (route_name?: string, step_seconds?: number, speed_kmh?: number) =>
    fetchAPI<{ status: string; ambulance_id: string }>('/amb/gps/start', {
      method: 'POST',
      body: JSON.stringify({
        route_name: route_name || 'default_city_loop',
        step_seconds: step_seconds || 3.0,
        speed_kmh: speed_kmh || 40.0,
      }),
    }),
  getCurrent: () => fetchAPI<GPSData>('/amb/gps/current'),
};

// Signal APIs (matching FastAPI backend)
export const signalAPI = {
  requestPriority: (ambulance_id: string, severity: string) =>
    fetchAPI<SignalResponse>(`/amb/signals/${ambulance_id}`, {
      method: 'POST',
      body: JSON.stringify({ severity }),
    }),
  getState: (signal_id: string) =>
    fetchAPI<{ state: string; history_count: number; green_time_remaining: number }>(
      `/amb/signals/${signal_id}/state`
    ),
};

// Corridor APIs (matching FastAPI backend)
export const corridorAPI = {
  update: (severity: string) =>
    fetchAPI<{
      ambulance_id: string;
      hospital_id?: string;
      severity: string;
      corridor_signals: string[];
      type: string;
    }>('/amb/corridor/update', {
      method: 'POST',
      body: JSON.stringify({ severity }),
    }),
  getStatus: (ambulance_id: string) =>
    fetchAPI<CorridorStatus>(`/amb/corridor/${ambulance_id}`),
};

// System APIs (matching FastAPI backend)
export const systemAPI = {
  getStatus: () => fetchAPI<SystemStatus>('/amb/system/status'),
  getLogs: (ambulance_id: string) =>
    fetchAPI<{ ambulance_id: string; logs: ConflictLog[] }>(`/amb/system/logs/${ambulance_id}`),
  getConflicts: (signal_id: string) =>
    fetchAPI<{ signal_id: string; conflict_history: ConflictLog[] }>(
      `/amb/system/conflicts/${signal_id}`
    ),
};

// Health check
export const healthAPI = {
  check: () => fetchAPI<{ status: string }>('/amb/health'),
};

// Traffic LLM APIs (matching FastAPI backend)
export const trafficAPI = {
  getLatest: () => fetchAPI<TrafficSnapshot>('/amb/traffic/latest'),
};

// Dashboard APIs (for control room - matching new backend)
export const dashboardAPI = {
  getOverview: async (): Promise<DashboardOverview> => {
    return await fetchAPI<DashboardOverview>('/amb/dashboard/overview');
  },
  getActiveTrips: async (): Promise<ActiveTripInfo[]> => {
    return await fetchAPI<ActiveTripInfo[]>('/amb/dashboard/active-trips');
  },
  getAllAmbulances: async (): Promise<Ambulance[]> => {
    return await fetchAPI<Ambulance[]>('/amb/dashboard/ambulances');
  },
  getAllSignals: async (): Promise<DashboardSignalInfo[]> => {
    return await fetchAPI<DashboardSignalInfo[]>('/amb/dashboard/signals');
  },
  getPendingCases: async () => {
    return await fetchAPI('/amb/dashboard/pending-cases');
  },
  getStats: async () => {
    return await fetchAPI('/amb/dashboard/stats');
  },
};

// Trip APIs (new endpoints)
export const tripAPI = {
  create: (emergency_id: string, ambulance_id: string, hospital_id?: string) =>
    fetchAPI<ActiveTripInfo>('/amb/trips', {
      method: 'POST',
      body: JSON.stringify({ emergency_id, ambulance_id, hospital_id }),
    }),
  get: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}`),
  accept: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}/accept`, { method: 'PUT' }),
  arriveScene: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}/arrive-scene`, { method: 'PUT' }),
  patientOnboard: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}/patient-onboard`, { method: 'PUT' }),
  arriveHospital: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}/arrive-hospital`, { method: 'PUT' }),
  complete: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}/complete`, { method: 'PUT' }),
  getRouteSignals: (trip_id: string) =>
    fetchAPI(`/amb/trips/${trip_id}/route-signals`),
};

// Emergency APIs (new endpoints)
export const emergencyAPI = {
  create: (data: {
    location_lat: number;
    location_lng: number;
    location_address?: string;
    emergency_type?: string;
    severity?: string;
    description?: string;
    reported_victims?: number;
  }) =>
    fetchAPI('/amb/trips/emergencies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getAll: () =>
    fetchAPI('/amb/trips/emergencies'),
  getPending: () =>
    fetchAPI('/amb/trips/emergencies/pending'),
};

// Ambulance APIs (updated to use new endpoints)
export const ambulanceAPI = {
  getAll: async (): Promise<Ambulance[]> => {
    try {
      return await fetchAPI<Ambulance[]>('/amb/ambulances');
    } catch {
      // Fallback to dashboard endpoint
      return await dashboardAPI.getAllAmbulances();
    }
  },
  getAvailable: () =>
    fetchAPI<Ambulance[]>('/amb/ambulances/available'),
  get: (ambulance_id: string) =>
    fetchAPI(`/amb/ambulances/${ambulance_id}`),
  updateLocation: (ambulance_id: string, lat: number, lng: number) =>
    fetchAPI(`/amb/ambulances/${ambulance_id}/location`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng }),
    }),
  updateStatus: (ambulance_id: string, status: string) =>
    fetchAPI(`/amb/ambulances/${ambulance_id}/status?status=${status}`, {
      method: 'PUT',
    }),
};

// Hospital APIs (use backend endpoint)
export const hospitalAPI = {
  getAll: async (): Promise<Hospital[]> => {
    try {
      return await fetchAPI<Hospital[]>('/amb/trips/hospitals/all');
    } catch {
      // Fallback to static data
      return [
        { id: 'HOSP-001', name: 'Apollo Hospital', lat: 13.0547, lng: 80.2526, total_beds: 100, available_beds: 25, is_active: true },
        { id: 'HOSP-002', name: 'Govt General Hospital', lat: 13.0732, lng: 80.2774, total_beds: 200, available_beds: 45, is_active: true },
        { id: 'HOSP-003', name: 'MIOT International', lat: 13.0132, lng: 80.1715, total_beds: 150, available_beds: 30, is_active: true },
        { id: 'HOSP-004', name: 'Fortis Malar', lat: 13.0078, lng: 80.2569, total_beds: 80, available_beds: 20, is_active: true },
      ];
    }
  },
};

// WebSocket connection
export function createWebSocket(channel: string): WebSocket {
  const wsUrl = API_BASE_URL.replace('http', 'ws');
  return new WebSocket(`${wsUrl}/ws/${channel}`);
}
