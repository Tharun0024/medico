/**
 * Notifications API Service
 * 
 * API bindings for notification management across all roles.
 * Includes mock data fallback for demo mode.
 */

import { apiClient, withMockFallback } from './client';
import { mockNotifications } from './mock-data';
import type {
  Notification,
  NotificationList,
  NotificationSeverity,
} from './types';

const BASE_PATH = '/api/notifications';

export const notificationsApi = {
  /**
   * Get notifications for current user/role
   */
  getNotifications: (options?: {
    unreadOnly?: boolean;
    severity?: NotificationSeverity;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set('unread_only', 'true');
    if (options?.severity) params.set('severity', options.severity);
    if (options?.limit) params.set('limit', String(options.limit));
    
    const queryString = params.toString();
    
    // Filter mock notifications
    let filtered = [...mockNotifications];
    if (options?.unreadOnly) {
      filtered = filtered.filter(n => n.read_at === null);
    }
    if (options?.severity) {
      filtered = filtered.filter(n => n.severity === options.severity);
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return withMockFallback(
      () => apiClient.get<NotificationList>(
        `${BASE_PATH}${queryString ? `?${queryString}` : ''}`
      ),
      {
        items: filtered,
        total: filtered.length,
        unread_count: filtered.filter(n => n.read_at === null).length,
      }
    );
  },
  
  /**
   * Mark notification as read
   */
  markAsRead: (notificationId: string) =>
    withMockFallback(
      () => apiClient.patch<Notification>(`${BASE_PATH}/${notificationId}/read`),
      {
        ...mockNotifications.find(n => n.id === notificationId) || mockNotifications[0],
        read_at: new Date().toISOString(),
      }
    ),
  
  /**
   * Mark all notifications as read
   */
  markAllAsRead: async () => {
    return withMockFallback(
      async () => {
        try {
          return await apiClient.post<{ count: number }>(`${BASE_PATH}/read-all`);
        } catch {
          return { count: 0 };
        }
      },
      { count: mockNotifications.filter(n => n.read_at === null).length }
    );
  },
  
  /**
   * Get unread count
   */
  getUnreadCount: async () => {
    return withMockFallback(
      async () => {
        try {
          return await apiClient.get<{ count: number }>(`${BASE_PATH}/unread-count`);
        } catch {
          return { count: 0 };
        }
      },
      { count: mockNotifications.filter(n => n.read_at === null).length }
    );
  },
};

export default notificationsApi;
