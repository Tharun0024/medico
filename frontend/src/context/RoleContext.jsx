import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Role configuration
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  HOSPITAL_ADMIN: 'hospital_admin',
  MEDICAL_STAFF: 'medical_staff',
  WASTE_TEAM: 'waste_team',
  EMERGENCY_SERVICE: 'emergency_service',
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.HOSPITAL_ADMIN]: 'Hospital Admin',
  [ROLES.MEDICAL_STAFF]: 'Medical Staff',
  [ROLES.WASTE_TEAM]: 'Waste Team',
  [ROLES.EMERGENCY_SERVICE]: 'Emergency Service',
};

// Roles that require a hospital_id
export const HOSPITAL_SCOPED_ROLES = [ROLES.HOSPITAL_ADMIN, ROLES.MEDICAL_STAFF];

/**
 * Context for role state
 */
const RoleContext = createContext(null);

/**
 * Provider component
 */
export function RoleProvider({ children }) {
  const [role, setRole] = useState(ROLES.SUPER_ADMIN);
  const [hospitalId, setHospitalId] = useState(null);

  const updateRole = useCallback((newRole) => {
    setRole(newRole);
    // Clear hospital_id if new role doesn't need it
    if (!HOSPITAL_SCOPED_ROLES.includes(newRole)) {
      setHospitalId(null);
    }
  }, []);

  const updateHospitalId = useCallback((id) => {
    setHospitalId(id ? parseInt(id, 10) : null);
  }, []);

  // Build headers for API requests
  const getHeaders = useCallback(() => {
    const headers = { 'X-Role': role };
    if (hospitalId && HOSPITAL_SCOPED_ROLES.includes(role)) {
      headers['X-Hospital-ID'] = String(hospitalId);
    }
    return headers;
  }, [role, hospitalId]);

  const value = {
    role,
    hospitalId,
    updateRole,
    updateHospitalId,
    getHeaders,
    requiresHospitalId: HOSPITAL_SCOPED_ROLES.includes(role),
  };

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/**
 * Hook to access role context
 */
export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
