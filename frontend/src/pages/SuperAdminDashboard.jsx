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
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

export default function SuperAdminDashboard() {
  const { getHeaders } = useRole();
  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const headers = getHeaders();

        const [overviewRes, perfRes] = await Promise.all([
          fetch('http://localhost:8000/api/admin/overview', { headers }),
          fetch('http://localhost:8000/api/admin/hospitals/performance', { headers }),
        ]);

        if (!overviewRes.ok || !perfRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const overviewData = await overviewRes.json();
        const perfData = await perfRes.json();

        // Calculate derived fields for overview
        const totalCapacity = (overviewData.total_icu_capacity || 0) + 
                             (overviewData.total_hdu_capacity || 0) + 
                             (overviewData.total_general_capacity || 0);
        const totalAvailable = (overviewData.total_icu_available || 0) + 
                              (overviewData.total_hdu_available || 0) + 
                              (overviewData.total_general_available || 0);
        const occupancyRate = totalCapacity > 0 
          ? ((totalCapacity - totalAvailable) / totalCapacity) * 100 
          : 0;

        setOverview({
          ...overviewData,
          total_bed_capacity: totalCapacity,
          total_available_beds: totalAvailable,
          system_occupancy_rate: occupancyRate,
        });
        setPerformance(perfData.items || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [getHeaders]);

  if (loading && !overview) {
    return <div style={{ color: '#94a3b8' }}>Loading...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444' }}>Error: {error}</div>;
  }

  return (
    <div>
      <div style={cardStyle}>
        <div style={titleStyle}>📊 System Overview</div>
        <div style={gridStyle}>
          <div style={statStyle}>
            <div style={statValue}>{overview?.total_hospitals || 0}</div>
            <div style={statLabel}>Total Hospitals</div>
          </div>
          <div style={statStyle}>
            <div style={statValue}>{overview?.active_hospitals || 0}</div>
            <div style={statLabel}>Active Hospitals</div>
          </div>
          <div style={statStyle}>
            <div style={statValue}>{overview?.total_bed_capacity || 0}</div>
            <div style={statLabel}>Total Bed Capacity</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#22c55e' }}>{overview?.total_available_beds || 0}</div>
            <div style={statLabel}>Available Beds</div>
          </div>
          <div style={statStyle}>
            <div style={{ ...statValue, color: '#f59e0b' }}>{overview?.active_emergencies || 0}</div>
            <div style={statLabel}>Active Emergencies</div>
          </div>
          <div style={statStyle}>
            <div style={statValue}>{(overview?.system_occupancy_rate || 0).toFixed(1)}%</div>
            <div style={statLabel}>System Occupancy</div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={titleStyle}>🏥 Hospital Performance</div>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Hospital</th>
              <th style={thStyle}>City</th>
              <th style={thStyle}>Capacity</th>
              <th style={thStyle}>Available</th>
              <th style={thStyle}>Occupancy</th>
              <th style={thStyle}>Emergencies</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((h) => (
              <tr key={h.hospital_id}>
                <td style={tdStyle}>{h.hospital_name}</td>
                <td style={tdStyle}>{h.city}</td>
                <td style={tdStyle}>{h.total_capacity}</td>
                <td style={tdStyle}>{h.total_capacity - h.total_occupied}</td>
                <td style={tdStyle}>{(h.occupancy_percentage || 0).toFixed(1)}%</td>
                <td style={tdStyle}>{h.active_emergencies_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
