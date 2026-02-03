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

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '13px',
};

const thStyle = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: '1px solid #334155',
  color: '#94a3b8',
  fontWeight: '500',
};

const tdStyle = {
  padding: '8px',
  borderBottom: '1px solid #1e293b',
  color: '#e2e8f0',
};

const selectStyle = {
  padding: '8px 12px',
  backgroundColor: '#0f172a',
  color: '#f1f5f9',
  border: '1px solid #475569',
  borderRadius: '4px',
  fontSize: '14px',
  cursor: 'pointer',
};

const eventItemStyle = {
  padding: '8px 12px',
  borderRadius: '4px',
  marginBottom: '6px',
  fontSize: '12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const getEventStyle = (type) => {
  if (type === 'emergency.created') {
    return { backgroundColor: '#7f1d1d', border: '1px solid #ef4444' };
  }
  if (type === 'emergency.assigned') {
    return { backgroundColor: '#1e3a5f', border: '1px solid #3b82f6' };
  }
  if (type === 'emergency.resolved') {
    return { backgroundColor: '#14532d', border: '1px solid #22c55e' };
  }
  if (type === 'emergency.failed') {
    return { backgroundColor: '#78350f', border: '1px solid #f59e0b' };
  }
  if (type.startsWith('bed.')) {
    return { backgroundColor: '#1e293b', border: '1px solid #475569' };
  }
  return { backgroundColor: '#0f172a', border: '1px solid #334155' };
};

const getEventIcon = (type) => {
  switch (type) {
    case 'emergency.created': return '🆘';
    case 'emergency.assigned': return '🏥';
    case 'emergency.resolved': return '✅';
    case 'emergency.failed': return '❌';
    case 'bed.reserved': return '🛏️';
    case 'bed.released': return '🔓';
    case 'bed.occupancy.updated': return '📊';
    default: return '📋';
  }
};

const getSeverityColor = (severity) => {
  switch (severity?.toLowerCase()) {
    case 'critical': return '#ef4444';
    case 'high': return '#f59e0b';
    default: return '#22c55e';
  }
};

export default function EmergencyDashboard() {
  const { getHeaders } = useRole();
  const [dashboard, setDashboard] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [severity, setSeverity] = useState('CRITICAL');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Capture emergency and bed events from WebSocket
  const handleEvent = useCallback((data) => {
    if (!data.type) return;
    
    // Capture emergency and bed events
    if (data.type.startsWith('emergency.') || data.type.startsWith('bed.')) {
      setEvents((prev) => {
        const updated = [...prev, { ...data, receivedAt: new Date() }];
        return updated.slice(-30); // Keep last 30
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = wsService.subscribe(handleEvent);
    return () => unsubscribe();
  }, [handleEvent]);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const headers = getHeaders();

        const [dashRes, availRes] = await Promise.all([
          fetch('http://localhost:8000/api/emergency/dashboard', { headers }),
          fetch('http://localhost:8000/api/emergency/bed-availability', { headers }),
        ]);

        if (!dashRes.ok || !availRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const dashData = await dashRes.json();
        const availData = await availRes.json();

        setDashboard(dashData);
        setAvailability(availData.hospitals || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 10000); // Fast refresh for emergency
    return () => clearInterval(interval);
  }, [getHeaders]);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const headers = getHeaders();
        const res = await fetch(
          `http://localhost:8000/api/emergency/suggest-hospital?severity=${severity}`,
          { headers }
        );

        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      }
    }

    fetchSuggestions();
  }, [severity, getHeaders]);

  if (loading && !dashboard) {
    return <div style={{ color: '#94a3b8' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={cardStyle}>
        <div style={titleStyle}>🚨 Emergency Services Overview</div>
        <div style={gridStyle}>
          <div style={statStyle}>
            <div style={statValue}>{dashboard?.total_hospitals || 0}</div>
            <div style={statLabel}>Total Hospitals</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#22c55e' }}>{dashboard?.hospitals_with_icu_available || 0}</div>
            <div style={statLabel}>With ICU Available</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#22c55e' }}>{dashboard?.total_icu_available || 0}</div>
            <div style={statLabel}>Total ICU Beds</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#f59e0b' }}>{dashboard?.active_emergencies || 0}</div>
            <div style={statLabel}>Active Emergencies</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={titleStyle}>🏥 Bed Availability</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Hospital</th>
              <th style={thStyle}>ICU</th>
              <th style={thStyle}>HDU</th>
              <th style={thStyle}>General</th>
            </tr>
          </thead>
          <tbody>
            {availability.map((h) => (
              <tr key={h.hospital_id}>
                <td style={tdStyle}>{h.hospital_name}</td>
                <td style={{ ...tdStyle, color: h.ICU_available > 0 ? '#22c55e' : '#ef4444' }}>
                  {h.ICU_available}
                </td>
                <td style={{ ...tdStyle, color: h.HDU_available > 0 ? '#22c55e' : '#f59e0b' }}>
                  {h.HDU_available}
                </td>
                <td style={tdStyle}>{h.GENERAL_available}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={titleStyle}>🎯 Hospital Suggestions</div>
          <select style={selectStyle} value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Rank</th>
              <th style={thStyle}>Hospital</th>
              <th style={thStyle}>Score</th>
              <th style={thStyle}>Available Wards</th>
            </tr>
          </thead>
          <tbody>
            {suggestions?.suggestions?.map((s, idx) => (
              <tr key={s.hospital_id}>
                <td style={tdStyle}>#{idx + 1}</td>
                <td style={tdStyle}>{s.hospital_name}</td>
                <td style={{ ...tdStyle, color: '#3b82f6', fontWeight: '600' }}>
                  {s.suitability_score.toFixed(0)}
                </td>
                <td style={tdStyle}>{s.available_wards.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Emergency & Bed Events Stream */}
      <div style={cardStyle}>
        <div style={titleStyle}>📡 Live Event Stream</div>
        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
          {events.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              Waiting for emergency and bed events...
            </div>
          ) : (
            events.slice().reverse().map((event, idx) => (
              <div key={idx} style={{ ...eventItemStyle, ...getEventStyle(event.type) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{getEventIcon(event.type)}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#e2e8f0', fontWeight: '500' }}>
                        {event.type.replace('.', ' ').toUpperCase()}
                      </span>
                      {event.payload?.severity && (
                        <span style={{ 
                          fontSize: '10px', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          backgroundColor: getSeverityColor(event.payload.severity) + '30',
                          color: getSeverityColor(event.payload.severity),
                          fontWeight: '600',
                        }}>
                          {event.payload.severity.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                      {event.payload?.hospital_name && `${event.payload.hospital_name}`}
                      {event.payload?.ward_type && ` - ${event.payload.ward_type.toUpperCase()}`}
                      {event.payload?.emergency_id && ` (Emergency #${event.payload.emergency_id})`}
                    </div>
                  </div>
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
  );
}
