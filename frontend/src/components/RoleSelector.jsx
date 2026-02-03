import React from 'react';
import { useRole, ROLES, ROLE_LABELS } from '../context/RoleContext';

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 12px',
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  border: '1px solid #334155',
};

const labelStyle = {
  fontSize: '12px',
  color: '#94a3b8',
  marginRight: '4px',
};

const selectStyle = {
  padding: '6px 10px',
  backgroundColor: '#0f172a',
  color: '#f1f5f9',
  border: '1px solid #475569',
  borderRadius: '4px',
  fontSize: '13px',
  cursor: 'pointer',
  outline: 'none',
};

const inputStyle = {
  padding: '6px 10px',
  backgroundColor: '#0f172a',
  color: '#f1f5f9',
  border: '1px solid #475569',
  borderRadius: '4px',
  fontSize: '13px',
  width: '80px',
  outline: 'none',
};

export default function RoleSelector() {
  const { role, hospitalId, updateRole, updateHospitalId, requiresHospitalId } = useRole();

  return (
    <div style={containerStyle}>
      <span style={labelStyle}>Role:</span>
      <select
        style={selectStyle}
        value={role}
        onChange={(e) => updateRole(e.target.value)}
      >
        {Object.entries(ROLES).map(([key, value]) => (
          <option key={key} value={value}>
            {ROLE_LABELS[value]}
          </option>
        ))}
      </select>

      {requiresHospitalId && (
        <>
          <span style={labelStyle}>Hospital ID:</span>
          <input
            type="number"
            style={inputStyle}
            value={hospitalId || ''}
            onChange={(e) => updateHospitalId(e.target.value)}
            placeholder="ID"
            min="1"
          />
        </>
      )}
    </div>
  );
}
