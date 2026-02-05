"use client";

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { toast } from 'sonner';
import type {
  WebSocketEvent,
  EmergencyCreatedEvent,
  EmergencyAssignedEvent,
  EmergencyResolvedEvent,
  BedUpdatedEvent,
  PatientAdmittedEvent,
  PatientDischargedEvent,
  WasteRequestedEvent,
  WasteCollectedEvent,
  WasteDisposedEvent,
  OutbreakRiskDetectedEvent,
  NotificationCreatedEvent,
} from '@/lib/api/types';

// ============================================================================
// Types
// ============================================================================

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

export type EventHandler<T = unknown> = (data: T) => void;

type EventHandlers = {
  [key: string]: EventHandler<unknown>[];
};

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  showToasts?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  status: WebSocketStatus;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: <T>(eventType: string, handler: EventHandler<T>) => () => void;
  lastMessage: WebSocketMessage | null;
}

// ============================================================================
// WebSocket URL Builder
// ============================================================================

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

function buildWebSocketUrl(role: string, hospitalId: number | null): string {
  const params = new URLSearchParams({ role });
  if (hospitalId !== null) {
    params.set('hospital_id', String(hospitalId));
  }
  return `${WS_BASE_URL}/ws?${params.toString()}`;
}

// ============================================================================
// Toast Notifications for Events
// ============================================================================

function showEventToast(event: WebSocketMessage) {
  const { type, data } = event;
  
  switch (type) {
    case 'emergency.created': {
      const e = data as EmergencyCreatedEvent;
      toast.error(`🚨 New Emergency`, {
        description: `${e.severity.toUpperCase()} severity emergency created`,
        duration: 5000,
      });
      break;
    }
    case 'emergency.assigned': {
      const e = data as EmergencyAssignedEvent;
      toast.success(`✅ Emergency Assigned`, {
        description: `Emergency #${e.emergency_id} assigned to hospital`,
        duration: 4000,
      });
      break;
    }
    case 'emergency.resolved': {
      const e = data as EmergencyResolvedEvent;
      toast.success(`✅ Emergency Resolved`, {
        description: `Emergency #${e.emergency_id} has been resolved`,
        duration: 4000,
      });
      break;
    }
    case 'bed.updated':
    case 'bed.reserved':
    case 'bed.released': {
      const e = data as BedUpdatedEvent;
      toast.info(`🛏️ Bed Update`, {
        description: `${e.ward_type.toUpperCase()} ward: ${e.action}`,
        duration: 3000,
      });
      break;
    }
    case 'patient.admitted': {
      const e = data as PatientAdmittedEvent;
      toast.info(`👤 Patient Admitted`, {
        description: `Patient #${e.patient_id} admitted to hospital`,
        duration: 3000,
      });
      break;
    }
    case 'patient.discharged': {
      const e = data as PatientDischargedEvent;
      toast.success(`👤 Patient Discharged`, {
        description: `Patient #${e.patient_id} has been discharged`,
        duration: 3000,
      });
      break;
    }
    case 'waste.requested': {
      const e = data as WasteRequestedEvent;
      toast.warning(`🗑️ Waste Pickup Requested`, {
        description: `${e.urgency.toUpperCase()} priority pickup for hospital #${e.hospital_id}`,
        duration: 4000,
      });
      break;
    }
    case 'waste.collected': {
      const e = data as WasteCollectedEvent;
      toast.success(`✅ Waste Collected`, {
        description: `${e.collected_kg}kg collected from hospital #${e.hospital_id}`,
        duration: 3000,
      });
      break;
    }
    case 'waste.disposed': {
      const e = data as WasteDisposedEvent;
      toast.success(`✅ Waste Disposed`, {
        description: `${e.disposed_kg}kg disposed from hospital #${e.hospital_id}`,
        duration: 3000,
      });
      break;
    }
    case 'outbreak.risk.detected': {
      const e = data as OutbreakRiskDetectedEvent;
      const icon = e.risk_level === 'high' ? '🔴' : e.risk_level === 'moderate' ? '🟡' : '🟢';
      toast.warning(`${icon} Outbreak Risk: ${e.risk_level.toUpperCase()}`, {
        description: `Factors: ${e.factors.join(', ')}`,
        duration: 6000,
      });
      break;
    }
    case 'notification.created': {
      const e = data as NotificationCreatedEvent;
      const variant = e.severity === 'critical' ? 'error' : 
                      e.severity === 'warning' ? 'warning' : 'info';
      toast[variant === 'error' ? 'error' : variant === 'warning' ? 'warning' : 'info'](
        `📢 ${e.title}`,
        { duration: 4000 }
      );
      break;
    }
    default:
      // Unknown event type - don't show toast
      break;
  }
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    showToasts = false, // Disabled by default for demo mode
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handlersRef = useRef<EventHandlers>({});
  
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Connect function
  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    cleanup();
    setStatus('connecting');

    const url = buildWebSocketUrl(user.role, user.hospitalId);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('connected');
      reconnectCountRef.current = 0;
      onConnect?.();
      if (showToasts) {
        toast.success('Connected to real-time updates');
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      onDisconnect?.();

      // Auto-reconnect logic
      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current += 1;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      setStatus('error');
      onError?.(error);
      if (showToasts) {
        toast.error('Connection error', {
          description: 'Failed to connect to real-time updates',
        });
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        setLastMessage(message);
        onMessage?.(message);

        // Show toast for important events
        if (showToasts) {
          showEventToast(message);
        }

        // Call registered handlers
        const handlers = handlersRef.current[message.type] || [];
        handlers.forEach((handler) => handler(message.data));
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    wsRef.current = ws;
  }, [user, cleanup, onConnect, onDisconnect, onError, onMessage, reconnectAttempts, reconnectInterval, showToasts]);

  // Disconnect function
  const disconnect = useCallback(() => {
    cleanup();
    setStatus('disconnected');
    reconnectCountRef.current = reconnectAttempts; // Prevent auto-reconnect
  }, [cleanup, reconnectAttempts]);

  // Subscribe to specific event types
  const subscribe = useCallback(<T,>(eventType: string, handler: EventHandler<T>) => {
    if (!handlersRef.current[eventType]) {
      handlersRef.current[eventType] = [];
    }
    handlersRef.current[eventType].push(handler as EventHandler<unknown>);

    // Return unsubscribe function
    return () => {
      const handlers = handlersRef.current[eventType];
      if (handlers) {
        const index = handlers.indexOf(handler as EventHandler<unknown>);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, []);

  // Auto-connect on mount if authenticated
  useEffect(() => {
    if (autoConnect && isAuthenticated && user) {
      connect();
    }

    return () => {
      cleanup();
    };
  }, [autoConnect, isAuthenticated, user, connect, cleanup]);

  return {
    status,
    isConnected: status === 'connected',
    connect,
    disconnect,
    subscribe,
    lastMessage,
  };
}

// ============================================================================
// Context for Global WebSocket Access
// ============================================================================

interface WebSocketContextType extends UseWebSocketReturn {}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ 
  children, 
  ...options 
}: { children: React.ReactNode } & UseWebSocketOptions) {
  const ws = useWebSocket(options);

  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext(): WebSocketContextType {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

export default useWebSocket;
