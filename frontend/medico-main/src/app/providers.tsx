"use client";

import { AuthProvider } from "@/lib/auth/auth-context";
import { QueryProvider } from "@/lib/providers/query-provider";
import { WebSocketProvider } from "@/lib/hooks/use-websocket";

/**
 * Client-side providers wrapper
 * 
 * Wraps the app with:
 * - React Query for data fetching
 * - Auth context for role-based access
 * - WebSocket context for real-time updates
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <WebSocketProvider showToasts={true}>
          {children}
        </WebSocketProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
