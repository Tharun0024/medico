/**
 * API Client Configuration
 * 
 * Centralized API client with automatic header attachment for RBAC.
 * All API calls should use this client to ensure proper authentication headers.
 * In demo mode, falls back to mock data when backend is unavailable.
 */

// Demo mode - set to true to use mock data fallbacks
export const DEMO_MODE = true;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

/**
 * Get stored auth context from localStorage
 */
export function getStoredAuth(): { role: string; hospitalId: number | null } | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem('medico_auth');
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Set auth context in localStorage
 */
export function setStoredAuth(role: string, hospitalId: number | null): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem('medico_auth', JSON.stringify({ role, hospitalId }));
}

/**
 * Clear auth context from localStorage
 */
export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('medico_auth');
}

/**
 * Build headers with RBAC context
 */
function buildHeaders(options?: ApiRequestOptions): Headers {
  const headers = new Headers(options?.headers);
  
  // Set default content type if not specified
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add RBAC headers if not skipping auth
  if (!options?.skipAuth) {
    const auth = getStoredAuth();
    if (auth) {
      headers.set('X-Role', auth.role);
      if (auth.hospitalId !== null) {
        headers.set('X-Hospital-ID', String(auth.hospitalId));
      }
    }
  }
  
  return headers;
}

/**
 * Parse API error response
 */
async function parseError(response: Response): Promise<ApiError> {
  try {
    const data = await response.json();
    return {
      status: response.status,
      message: data.detail || data.message || response.statusText,
      detail: data.detail,
    };
  } catch {
    return {
      status: response.status,
      message: response.statusText,
    };
  }
}

/**
 * Core API request function
 */
async function request<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = buildHeaders(options);
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await parseError(response);
    throw error;
  }
  
  // Handle empty responses
  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }
  
  return {} as T;
}

/**
 * API Client with typed methods
 */
export const apiClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
  
  /**
   * POST request
   */
  post: <T>(endpoint: string, data?: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  /**
   * PUT request
   */
  put: <T>(endpoint: string, data?: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, data?: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
  
  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Helper to simulate API delay for demo mode
 */
export const simulateDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Wrap an API call with mock fallback for demo mode
 */
export async function withMockFallback<T>(
  apiCall: () => Promise<T>,
  mockData: T,
  delayMs: number = 300
): Promise<T> {
  if (!DEMO_MODE) {
    return apiCall();
  }
  
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    console.log('[Demo Mode] Using mock data:', error);
    await simulateDelay(delayMs);
    return mockData;
  }
}

export default apiClient;
