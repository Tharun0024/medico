"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserRole } from '@/lib/api/types';
import { getStoredAuth, setStoredAuth, clearStoredAuth } from '@/lib/api/client';

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  role: UserRole;
  hospitalId: number | null;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (role: UserRole, hospitalId: number | null, displayName?: string) => void;
  logout: () => void;
  switchRole: (role: UserRole, hospitalId?: number | null) => void;
}

// ============================================================================
// Role Configuration
// ============================================================================

export const ROLE_CONFIG: Record<UserRole, {
  label: string;
  dashboardPath: string;
  requiresHospital: boolean;
  defaultDisplayName: string;
}> = {
  super_admin: {
    label: 'Super Admin',
    dashboardPath: '/super-admin',
    requiresHospital: false,
    defaultDisplayName: 'Health Minister',
  },
  hospital_admin: {
    label: 'Hospital Admin',
    dashboardPath: '/hospital-admin',
    requiresHospital: true,
    defaultDisplayName: 'Hospital Administrator',
  },
  medical_staff: {
    label: 'Medical Staff',
    dashboardPath: '/medical-staff',
    requiresHospital: true,
    defaultDisplayName: 'Medical Staff',
  },
  waste_team: {
    label: 'Waste Team',
    dashboardPath: '/waste-management',
    requiresHospital: false,
    defaultDisplayName: 'Waste Management Team',
  },
  emergency_service: {
    label: 'Emergency Service',
    dashboardPath: '/emergency',
    requiresHospital: false,
    defaultDisplayName: 'Emergency Operator',
  },
  control_room: {
    label: 'Control Room',
    dashboardPath: '/control-room',
    requiresHospital: false,
    defaultDisplayName: 'Control Room Operator',
  },
};

// ============================================================================
// Route to Role Mapping (for auto-auth in demo mode)
// ============================================================================

const ROUTE_TO_ROLE: Record<string, { role: UserRole; hospitalId: number | null }> = {
  '/super-admin': { role: 'super_admin', hospitalId: null },
  '/hospital-admin': { role: 'hospital_admin', hospitalId: 1 },
  '/medical-staff': { role: 'medical_staff', hospitalId: 1 },
  '/waste-management': { role: 'waste_team', hospitalId: null },
  '/emergency': { role: 'emergency_service', hospitalId: null },
  '/control-room': { role: 'control_room', hospitalId: null },
};

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Auto-set auth based on current route (Demo Mode)
  useEffect(() => {
    // Find matching route prefix
    const matchedRoute = Object.keys(ROUTE_TO_ROLE).find(route => 
      pathname?.startsWith(route)
    );
    
    if (matchedRoute) {
      const { role, hospitalId } = ROUTE_TO_ROLE[matchedRoute];
      const config = ROLE_CONFIG[role];
      
      // Set auth in localStorage and state
      setStoredAuth(role, hospitalId);
      setUser({
        role,
        hospitalId,
        displayName: config.defaultDisplayName,
      });
    } else {
      // Try loading from localStorage for non-dashboard routes
      const stored = getStoredAuth();
      if (stored) {
        const config = ROLE_CONFIG[stored.role as UserRole];
        setUser({
          role: stored.role as UserRole,
          hospitalId: stored.hospitalId,
          displayName: config?.defaultDisplayName || 'User',
        });
      }
    }
    setIsLoading(false);
  }, [pathname]);

  // Login function
  const login = useCallback((
    role: UserRole,
    hospitalId: number | null,
    displayName?: string
  ) => {
    const config = ROLE_CONFIG[role];
    
    // Validate hospital requirement
    if (config.requiresHospital && hospitalId === null) {
      throw new Error(`Role ${role} requires a hospital ID`);
    }
    
    // Store auth
    setStoredAuth(role, hospitalId);
    
    // Update state
    setUser({
      role,
      hospitalId,
      displayName: displayName || config.defaultDisplayName,
    });
    
    // Redirect to dashboard
    router.push(config.dashboardPath);
  }, [router]);

  // Logout function
  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    router.push('/login');
  }, [router]);

  // Switch role (for multi-role users)
  const switchRole = useCallback((role: UserRole, hospitalId?: number | null) => {
    const config = ROLE_CONFIG[role];
    const newHospitalId = hospitalId ?? user?.hospitalId ?? null;
    
    if (config.requiresHospital && newHospitalId === null) {
      throw new Error(`Role ${role} requires a hospital ID`);
    }
    
    setStoredAuth(role, newHospitalId);
    setUser({
      role,
      hospitalId: newHospitalId,
      displayName: config.defaultDisplayName,
    });
    
    router.push(config.dashboardPath);
  }, [router, user?.hospitalId]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    switchRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ============================================================================
// Route Protection Hook
// ============================================================================

export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Temporarily disabled for development - allow access to all dashboards
  // useEffect(() => {
  //   if (isLoading) return;
  //   
  //   // Not authenticated - redirect to login
  //   if (!isAuthenticated) {
  //     router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  //     return;
  //   }
  //   
  //   // Role restriction check
  //   if (allowedRoles && user && !allowedRoles.includes(user.role)) {
  //     // Redirect to their own dashboard
  //     const config = ROLE_CONFIG[user.role];
  //     router.push(config.dashboardPath);
  //   }
  // }, [isLoading, isAuthenticated, user, allowedRoles, router, pathname]);

  return { user, isLoading: false, isAuthenticated: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getRoleFromPath(path: string): UserRole | null {
  const pathMap: Record<string, UserRole> = {
    '/super-admin': 'super_admin',
    '/hospital-admin': 'hospital_admin',
    '/medical-staff': 'medical_staff',
    '/waste-management': 'waste_team',
    '/emergency': 'emergency_service',
    '/control-room': 'control_room',
  };
  
  for (const [prefix, role] of Object.entries(pathMap)) {
    if (path.startsWith(prefix)) {
      return role;
    }
  }
  
  return null;
}

export function canAccessPath(user: AuthUser | null, path: string): boolean {
  if (!user) return false;
  
  const pathRole = getRoleFromPath(path);
  if (!pathRole) return true; // Public paths
  
  // Super admin can access everything
  if (user.role === 'super_admin') return true;
  
  // Check if user's role matches the path
  return user.role === pathRole;
}
