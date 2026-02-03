import React, { useState, useEffect, useCallback } from 'react';
import { useRole } from '../context/RoleContext';
import { wsService } from '../services/ws';

const cardStyle = {
  backgroundColor: '#1e293b',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '16px',
  border: '1px solid #334155',
};

const titleStyle = {
  fontSize: '18px',
  fontWeight: '600',
  color: '#f1f5f9',
  marginBottom: '16px',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '16px',
};

const wardCardStyle = {
  backgroundColor: '#0f172a',
  padding: '16px',
  borderRadius: '8px',
  textAlign: 'center',
};

const wardTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#e2e8f0',
  marginBottom: '12px',
};

const alertBanner = {
  padding: '12px 16px',
  borderRadius: '8px',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const progressBarBg = {
  height: '12px',
  backgroundColor: '#334155',
  borderRadius: '6px',
  overflow: 'hidden',
  marginTop: '8px',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: '500',
};

const tdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
};

const eventItemStyle = {
  padding: '8px 12px',
  backgroundColor: '#0f172a',
  borderRadius: '4px',
  marginBottom: '6px',
  fontSize: '12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

export default function MedicalStaffDashboard() {
  const { getHeaders, hospitalId } = useRole();
  const [dashboard, setDashboard] = useState(null);
  const [wards, setWards] = useState([]);
  const [emergencyEvents, setEmergencyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter emergency events from WebSocket
  const handleEvent = useCallback((data) => {
    if (!data.type) return;
    
    // Only capture emergency-related events
    if (data.type.startsWith('emergency.')) {
      setEmergencyEvents((prev) => {
        const updated = [...prev, { ...data, receivedAt: new Date() }];
        return updated.slice(-20); // Keep last 20
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = wsService.subscribe(handleEvent);
    return () => unsubscribe();
  }, [handleEvent]);

  useEffect(() => {
    if (!hospitalId) {
      setLoading(false);
      setError('Please enter a Hospital ID');
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const headers = getHeaders();
        
        const [dashRes, wardsRes] = await Promise.all([
          fetch('http://localhost:8000/api/medical/dashboard', { headers }),
          fetch('http://localhost:8000/api/medical/wards', { headers }),
        ]);

        if (!dashRes.ok || !wardsRes.ok) {
          throw new Error('Failed to fetch dashboard');
        }

        const dashData = await dashRes.json();
        const wardsData = await wardsRes.json();
        
        setDashboard(dashData);
        setWards(wardsData.wards || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 10000); // Fast refresh for medical staff
    return () => clearInterval(interval);
  }, [getHeaders, hospitalId]);

  if (!hospitalId) {
    return <div style={{ color: '#f59e0b' }}>⚠️ Please enter a Hospital ID in the selector above</div>;
  }

  if (loading && !dashboard) {
    return <div style={{ color: '#94a3b8' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  }

  const getOccupancyColor = (occupied, capacity) => {
    const rate = capacity > 0 ? (occupied / capacity) * 100 : 0;
    if (rate >= 90) return '#ef4444';
    if (rate >= 70) return '#f59e0b';
    return '#22c55e';
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'emergency.created': return '🆕';
      case 'emergency.assigned': return '🏥';
      case 'emergency.resolved': return '✅';
      case 'emergency.failed': return '❌';
      default: return '📋';
    }
  };

  return (
    <div>
      {/* Emergency Alert Banner */}
      {dashboard?.emergency_flags && (
        <div style={{ ...alertBanner, backgroundColor: '#7f1d1d', border: '1px solid #ef4444' }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div>
            <div style={{ color: '#fecaca', fontWeight: '600', fontSize: '16px' }}>
              EMERGENCY ALERT
            </div>
            <div style={{ color: '#fca5a5', fontSize: '13px' }}>
              {dashboard.active_emergencies} active case(s) with CRITICAL or HIGH severity
            </div>
          </div>
          <div style={{ marginLeft: 'auto', color: '#fca5a5', fontSize: '24px' }}>
            ⚠️
          </div>
        </div>
      )}

      {/* Ward Status Cards */}
      <div style={cardStyle}>
        <div style={titleStyle}>🏥 {dashboard?.hospital_name} - Ward Status</div>
        <div style={gridStyle}>
          {dashboard?.wards?.map((ward) => {
            const color = getOccupancyColor(ward.occupied, ward.total_capacity);
            const occupancyRate = ward.total_capacity > 0
              ? (ward.occupied / ward.total_capacity) * 100
              : 0;
            return (
              <div key={ward.ward_type} style={wardCardStyle}>
                <div style={wardTitleStyle}>{ward.ward_type}</div>
                <div style={{ fontSize: '36px', fontWeight: '700', color }}>
                  {ward.available}
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  beds available
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                  {ward.occupied} / {ward.total_capacity} occupied
                </div>
                <div style={progressBarBg}>
                  <div
                    style={{
                      height: '100%',
                      width: `${occupancyRate}%`,
                      backgroundColor: color,
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ward Table */}
      <div style={cardStyle}>
        <div style={titleStyle}>📊 Ward Details</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Ward Type</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Capacity</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Occupied</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Available</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Utilization</th>
            </tr>
          </thead>
          <tbody>
            {wards.map((ward) => {
              const rate = ward.total_capacity > 0 
                ? (ward.occupied / ward.total_capacity) * 100 
                : 0;
              const color = getOccupancyColor(ward.occupied, ward.total_capacity);
              return (
                <tr key={ward.ward_type}>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: '600' }}>{ward.ward_type}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{ward.total_capacity}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{ward.occupied}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color, fontWeight: '600' }}>
                    {ward.available}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: '4px', 
                      backgroundColor: color + '20',
                      color,
                      fontWeight: '600',
                      fontSize: '12px',
                    }}>
                      {rate.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick Stats & Emergency Flag */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={cardStyle}>
          <div style={titleStyle}>📋 Quick Stats</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Active Emergencies</span>
              <span style={{ color: '#f59e0b', fontWeight: '600', fontSize: '18px' }}>
                {dashboard?.active_emergencies || 0}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8' }}>Emergency Flag</span>
              <span style={{ 
                color: dashboard?.emergency_flags ? '#ef4444' : '#22c55e', 
                fontWeight: '600',
                fontSize: '14px',
              }}>
                {dashboard?.emergency_flags ? '🔴 ACTIVE' : '🟢 CLEAR'}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Events Stream */}
        <div style={cardStyle}>
          <div style={titleStyle}>🚨 Emergency Events</div>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {emergencyEvents.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '16px' }}>
                No emergency events yet
              </div>
            ) : (
              emergencyEvents.slice().reverse().map((event, idx) => (
                <div key={idx} style={eventItemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{getEventIcon(event.type)}</span>
                    <span style={{ color: '#e2e8f0' }}>
                      {event.type.replace('emergency.', '').toUpperCase()}
                    </span>
                    {event.payload?.severity && (
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        backgroundColor: event.payload.severity === 'critical' ? '#7f1d1d' : '#78350f',
                        color: '#fca5a5',
                      }}>
                        {event.payload.severity}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {event.receivedAt.toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}