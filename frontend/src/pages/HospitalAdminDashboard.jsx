import React, { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '16px',
};

const statStyle = {
  backgroundColor: '#0f172a',
  padding: '12px',
  borderRadius: '6px',
  textAlign: 'center',
};

const statValue = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#3b82f6',
};

const statLabel = {
  fontSize: '12px',
  color: '#94a3b8',
  marginTop: '4px',
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
  marginBottom: '8px',
};

const progressBarBg = {
  height: '10px',
  backgroundColor: '#334155',
  borderRadius: '5px',
  overflow: 'hidden',
  marginTop: '8px',
};

const alertBanner = {
  padding: '12px 16px',
  borderRadius: '8px',
  marginBottom: '16px',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
};

const eventItemStyle = {
  padding: '8px 12px',
  backgroundColor: '#0f172a',
  borderRadius: '4px',
  marginBottom: '8px',
  fontSize: '13px',
};

export default function HospitalAdminDashboard() {
  const { getHeaders, hospitalId } = useRole();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        const res = await fetch('http://localhost:8000/api/hospital/dashboard', { headers });

        if (!res.ok) {
          throw new Error('Failed to fetch dashboard');
        }

        const data = await res.json();
        setDashboard(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15000);
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

  const getOccupancyColor = (rate) => {
    if (rate >= 90) return '#ef4444';
    if (rate >= 70) return '#f59e0b';
    return '#22c55e';
  };

  const getWasteColor = (level) => {
    switch (level) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const wasteStatus = dashboard?.waste_status;
  const recentEvents = dashboard?.recent_events || [];

  return (
    <div>
      {/* Waste Alert Banner */}
      {wasteStatus?.alert_level && wasteStatus.alert_level !== 'normal' && (
        <div
          style={{
            ...alertBanner,
            backgroundColor: wasteStatus.alert_level === 'critical' ? '#7f1d1d' : '#78350f',
            border: `1px solid ${wasteStatus.alert_level === 'critical' ? '#ef4444' : '#f59e0b'}`,
          }}
        >
          <span style={{ fontSize: '20px' }}>🗑️</span>
          <div>
            <div style={{ color: '#fecaca', fontWeight: '600' }}>
              Waste {wasteStatus.alert_level.toUpperCase()}
            </div>
            <div style={{ color: '#fca5a5', fontSize: '13px' }}>
              Estimated: {(wasteStatus.estimated_kg || 0).toFixed(1)} kg
              {wasteStatus.collection_due && ' - Collection due'}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div style={cardStyle}>
        <div style={titleStyle}>🏥 {dashboard?.hospital_name || 'Hospital'} Dashboard</div>
        <div style={gridStyle}>
          <div style={statStyle}>
            <div style={statValue}>{dashboard?.total_capacity || 0}</div>
            <div style={statLabel}>Total Capacity</div>
          </div>
          <div style={statStyle}>
            <div style={statValue}>{dashboard?.total_occupied || 0}</div>
            <div style={statLabel}>Occupied</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#22c55e' }}>
              {(dashboard?.total_capacity || 0) - (dashboard?.total_occupied || 0)}
            </div>
            <div style={statLabel}>Available</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: getOccupancyColor(dashboard?.overall_occupancy_percentage || 0) }}>
              {(dashboard?.overall_occupancy_percentage || 0).toFixed(1)}%
            </div>
            <div style={statLabel}>Occupancy Rate</div>
          </div>
        </div>
      </div>

      {/* Ward Utilization Cards */}
      <div style={cardStyle}>
        <div style={titleStyle}>🛏️ Ward Utilization</div>
        <div style={gridStyle}>
          {dashboard?.ward_utilization?.map((ward) => {
            const color = getOccupancyColor(ward.occupancy_percentage || 0);
            return (
              <div key={ward.ward_type} style={wardCardStyle}>
                <div style={wardTitleStyle}>{ward.ward_type}</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color }}>
                  {ward.available}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>available</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
                  {ward.occupied} / {ward.total_capacity} occupied
                </div>
                <div style={progressBarBg}>
                  <div
                    style={{
                      height: '100%',
                      width: `${ward.occupancy_percentage || 0}%`,
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

      {/* Emergencies & Waste Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Active Emergencies */}
        <div style={cardStyle}>
          <div style={titleStyle}>🚨 Emergency Cases</div>
          <div style={gridStyle}>
            <div style={statStyle}>
              <div style={{ ...statValue, color: '#f59e0b' }}>{dashboard?.active_emergencies || 0}</div>
              <div style={statLabel}>Active</div>
            </div>
            <div style={statStyle}>
              <div style={{ ...statValue, color: '#3b82f6' }}>{dashboard?.assigned_emergencies || 0}</div>
              <div style={statLabel}>Assigned</div>
            </div>
            <div style={statStyle}>
              <div style={{ ...statValue, color: '#22c55e' }}>{dashboard?.resolved_today || 0}</div>
              <div style={statLabel}>Resolved Today</div>
            </div>
          </div>
        </div>

        {/* Waste Status Panel */}
        <div style={cardStyle}>
          <div style={titleStyle}>🗑️ Waste Status</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Alert Level</span>
              <span
                style={{
                  color: getWasteColor(wasteStatus?.alert_level),
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                {(wasteStatus?.alert_level || 'normal').toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Estimated Waste</span>
              <span style={{ color: '#e2e8f0', fontSize: '14px' }}>
                {(wasteStatus?.estimated_kg || 0).toFixed(1)} kg
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '13px' }}>Collection Due</span>
              <span
                style={{
                  color: wasteStatus?.collection_due ? '#f59e0b' : '#22c55e',
                  fontSize: '14px',
                }}
              >
                {wasteStatus?.collection_due ? 'YES' : 'NO'}
              </span>
            </div>
            {wasteStatus?.last_collection && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>Last Collection</span>
                <span style={{ color: '#64748b', fontSize: '12px' }}>
                  {new Date(wasteStatus.last_collection).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <div style={cardStyle}>
          <div style={titleStyle}>📋 Recent Events</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {recentEvents.map((event, idx) => (
              <div key={idx} style={eventItemStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#e2e8f0' }}>{event.summary}</span>
                  <span style={{ color: '#64748b', fontSize: '11px' }}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
