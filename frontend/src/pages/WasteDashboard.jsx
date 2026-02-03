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

const buttonStyle = {
  padding: '6px 12px',
  backgroundColor: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '12px',
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

const getAlertColor = (level) => {
  switch (level) {
    case 'critical': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#22c55e';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return '#22c55e';
    case 'in_progress': return '#3b82f6';
    default: return '#f59e0b';
  }
};

const getEventStyle = (type) => {
  if (type.includes('critical')) {
    return { backgroundColor: '#7f1d1d', border: '1px solid #ef4444' };
  }
  if (type.includes('warning')) {
    return { backgroundColor: '#78350f', border: '1px solid #f59e0b' };
  }
  if (type.includes('collected')) {
    return { backgroundColor: '#14532d', border: '1px solid #22c55e' };
  }
  return { backgroundColor: '#0f172a', border: '1px solid #334155' };
};

const getEventIcon = (type) => {
  if (type.includes('critical')) return '🚨';
  if (type.includes('warning')) return '⚠️';
  if (type.includes('collected')) return '✅';
  return '🗑️';
};

export default function WasteDashboard() {
  const { getHeaders } = useRole();
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [wasteEvents, setWasteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter waste events from WebSocket
  const handleEvent = useCallback((data) => {
    if (!data.type) return;
    
    // Only capture waste-related events
    if (data.type.startsWith('waste.')) {
      setWasteEvents((prev) => {
        const updated = [...prev, { ...data, receivedAt: new Date() }];
        return updated.slice(-25); // Keep last 25
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = wsService.subscribe(handleEvent);
    return () => unsubscribe();
  }, [handleEvent]);

  const fetchData = async () => {
    try {
      const headers = getHeaders();

      const [dashRes, tasksRes] = await Promise.all([
        fetch('http://localhost:8000/api/waste/dashboard', { headers }),
        fetch('http://localhost:8000/api/waste/tasks', { headers }),
      ]);

      if (!dashRes.ok || !tasksRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const dashData = await dashRes.json();
      const tasksData = await tasksRes.json();

      setDashboard(dashData);
      setTasks(tasksData.tasks || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [getHeaders]);

  const completeTask = async (taskId) => {
    try {
      const headers = getHeaders();
      const res = await fetch(`http://localhost:8000/api/waste/tasks/${taskId}/complete`, {
        method: 'POST',
        headers,
      });

      if (res.ok) {
        fetchData(); // Refresh
      }
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  if (loading && !dashboard) {
    return <div style={{ color: '#94a3b8' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');

  return (
    <div>
      <div style={cardStyle}>
        <div style={titleStyle}>🗑️ Waste Management Overview</div>
        <div style={gridStyle}>
          <div style={statStyle}>
            <div style={statValue}>{dashboard?.hospitals_monitored || 0}</div>
            <div style={statLabel}>Hospitals Monitored</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: getAlertColor(dashboard?.overall_alert_level) }}>
              {(dashboard?.overall_alert_level || 'normal').toUpperCase()}
            </div>
            <div style={statLabel}>Alert Level</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#f59e0b' }}>{dashboard?.pending_collections || 0}</div>
            <div style={statLabel}>Pending Collections</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#22c55e' }}>{dashboard?.completed_today || 0}</div>
            <div style={statLabel}>Completed Today</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={titleStyle}>📋 Pending Tasks ({pendingTasks.length})</div>
        {pendingTasks.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: '24px' }}>
            ✅ No pending tasks
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Task ID</th>
                <th style={thStyle}>Hospital</th>
                <th style={thStyle}>Waste Type</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingTasks.map((task) => (
                <tr key={task.task_id}>
                  <td style={tdStyle}>{task.task_id}</td>
                  <td style={tdStyle}>{task.hospital_name}</td>
                  <td style={tdStyle}>{task.waste_type}</td>
                  <td style={tdStyle}>
                    <span style={{ color: task.priority === 'high' ? '#ef4444' : '#94a3b8' }}>
                      {task.priority}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <button style={buttonStyle} onClick={() => completeTask(task.task_id)}>
                      Complete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={cardStyle}>
        <div style={titleStyle}>🏥 Hospital Waste Levels</div>
        <div style={gridStyle}>
          {dashboard?.waste_levels?.map((h) => (
            <div key={h.hospital_id} style={statStyle}>
              <div style={{ fontSize: '14px', color: '#e2e8f0', marginBottom: '8px' }}>
                {h.hospital_name}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: getAlertColor(h.alert_level) }}>
                {h.current_level}%
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>{h.alert_level}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Waste Events Stream */}
      <div style={cardStyle}>
        <div style={titleStyle}>📡 Waste Events Stream</div>
        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {wasteEvents.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
              No waste events yet - waiting for activity...
            </div>
          ) : (
            wasteEvents.slice().reverse().map((event, idx) => (
              <div key={idx} style={{ ...eventItemStyle, ...getEventStyle(event.type) }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{getEventIcon(event.type)}</span>
                  <div>
                    <div style={{ color: '#e2e8f0', fontWeight: '500' }}>
                      {event.type.replace('waste.', '').replace('.', ' ').toUpperCase()}
                    </div>
                    {event.payload?.hospital_name && (
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                        {event.payload.hospital_name}
                        {event.payload?.waste_type && ` - ${event.payload.waste_type}`}
                        {event.payload?.level && ` (${event.payload.level}%)`}
                      </div>
                    )}
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
