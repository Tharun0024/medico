import React, { useState, useEffect, useCallback, useRef } from 'react';
import { wsService } from './services/ws';
import { RoleProvider, useRole, ROLES } from './context/RoleContext';
import RoleSelector from './components/RoleSelector';
import SummaryCards from './components/SummaryCards';
import EventStream from './components/EventStream';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import HospitalAdminDashboard from './pages/HospitalAdminDashboard';
import MedicalStaffDashboard from './pages/MedicalStaffDashboard';
import WasteDashboard from './pages/WasteDashboard';
import EmergencyDashboard from './pages/EmergencyDashboard';

const MAX_EVENTS = 100;

const appStyle = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '24px',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '24px',
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#f1f5f9',
};

const subtitleStyle = {
  fontSize: '14px',
  color: '#64748b',
};

// Role-based dashboard component mapping
const ROLE_DASHBOARDS = {
  [ROLES.SUPER_ADMIN]: SuperAdminDashboard,
  [ROLES.HOSPITAL_ADMIN]: HospitalAdminDashboard,
  [ROLES.MEDICAL_STAFF]: MedicalStaffDashboard,
  [ROLES.WASTE_TEAM]: WasteDashboard,
  [ROLES.EMERGENCY_SERVICE]: EmergencyDashboard,
};

function DashboardContent({ events, connected, stats }) {
  const { role } = useRole();
  const DashboardComponent = ROLE_DASHBOARDS[role] || SuperAdminDashboard;

  return (
    <>
      <DashboardComponent />
      <div style={{ marginTop: '24px' }}>
        <SummaryCards stats={stats} />
        <EventStream events={events} connected={connected} />
      </div>
    </>
  );
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({
    activeEmergencies: 0,
    assignedEmergencies: 0,
    icuAvailable: 0,
    icuTotal: 0,
    wasteAlertLevel: 'normal',
    totalEvents: 0,
  });

  // Fetch initial stats from API
  useEffect(() => {
    async function fetchInitialStats() {
      try {
        const res = await fetch('http://localhost:8000/api/admin/overview', {
          headers: { 'X-Role': 'super_admin' },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(prev => ({
            ...prev,
            activeEmergencies: data.active_emergencies || 0,
            assignedEmergencies: data.assigned_emergencies || 0,
            icuAvailable: data.total_icu_available || 0,
            icuTotal: data.total_icu_capacity || 0,
            wasteAlertLevel: data.waste_alert_count > 0 ? 'warning' : 'normal',
          }));
        }
      } catch (err) {
        console.error('Failed to fetch initial stats:', err);
      }
    }
    fetchInitialStats();
    // Refresh stats periodically
    const interval = setInterval(fetchInitialStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update stats based on events
  const updateStats = useCallback((event) => {
    setStats((prev) => {
      const updated = { ...prev, totalEvents: prev.totalEvents + 1 };

      switch (event.type) {
        case 'emergency.created':
          updated.activeEmergencies = prev.activeEmergencies + 1;
          break;
        case 'emergency.assigned':
          updated.assignedEmergencies = prev.assignedEmergencies + 1;
          break;
        case 'emergency.resolved':
          updated.activeEmergencies = Math.max(0, prev.activeEmergencies - 1);
          updated.assignedEmergencies = Math.max(0, prev.assignedEmergencies - 1);
          break;
        case 'bed.occupancy.updated':
          if (event.payload?.ward_type === 'icu') {
            const capacity = event.payload.capacity || 0;
            const occupied = event.payload.new_occupied || 0;
            updated.icuTotal = capacity;
            updated.icuAvailable = capacity - occupied;
          }
          break;
        case 'bed.reserved':
          if (event.payload?.ward_type === 'icu') {
            updated.icuAvailable = Math.max(0, prev.icuAvailable - 1);
          }
          break;
        case 'bed.released':
          if (event.payload?.ward_type === 'icu') {
            updated.icuAvailable = prev.icuAvailable + 1;
          }
          break;
        case 'waste.threshold.warning':
          updated.wasteAlertLevel = 'warning';
          break;
        case 'waste.threshold.critical':
          updated.wasteAlertLevel = 'critical';
          break;
        case 'waste.collected':
          updated.wasteAlertLevel = 'normal';
          break;
        default:
          break;
      }

      return updated;
    });
  }, []);

  // Use ref to keep handleEvent stable while accessing latest updateStats
  const handleEventRef = useRef();
  handleEventRef.current = (data) => {
    // Skip ping/pong and status messages
    if (!data.type || data.type === 'pong' || data.type === 'status' || data.type === 'echo') {
      return;
    }

    // Add to event list (keep last MAX_EVENTS) - including 'connected' message
    setEvents((prev) => {
      const newEvent = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      const updated = [...prev, newEvent];
      return updated.slice(-MAX_EVENTS);
    });

    // Update stats if it's an actual event (has event_id)
    if (data.event_id) {
      updateStats(data);
    }
  };

  // Connect to WebSocket on mount
  useEffect(() => {
    wsService.connect();

    // Use wrapper to always call latest handler
    const handleEvent = (data) => handleEventRef.current?.(data);
    
    const unsubMessage = wsService.subscribe(handleEvent);
    const unsubConnection = wsService.subscribeConnection(setConnected);

    return () => {
      unsubMessage();
      unsubConnection();
    };
  }, []); // Empty deps - connect once on mount

  return (
    <RoleProvider>
      <div style={appStyle}>
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>🏥 MEDICO Dashboard</div>
            <div style={subtitleStyle}>
              Hospital Coordination & Emergency Orchestration
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <RoleSelector />
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        <DashboardContent events={events} connected={connected} stats={stats} />
      </div>
    </RoleProvider>
  );
}
