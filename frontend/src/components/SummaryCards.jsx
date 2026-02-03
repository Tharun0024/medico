import React from 'react';

const cardStyle = {
  background: '#1e293b',
  borderRadius: '8px',
  padding: '16px 20px',
  minWidth: '200px',
  flex: '1',
};

const labelStyle = {
  fontSize: '12px',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

const valueStyle = {
  fontSize: '28px',
  fontWeight: '600',
};

const subTextStyle = {
  fontSize: '12px',
  color: '#64748b',
  marginTop: '4px',
};

function SummaryCard({ label, value, subText, color = '#22d3ee' }) {
  return (
    <div style={cardStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ ...valueStyle, color }}>{value}</div>
      {subText && <div style={subTextStyle}>{subText}</div>}
    </div>
  );
}

export default function SummaryCards({ stats }) {
  const {
    activeEmergencies = 0,
    assignedEmergencies = 0,
    icuAvailable = 0,
    icuTotal = 0,
    wasteAlertLevel = 'normal',
    totalEvents = 0,
  } = stats;

  const wasteColor = {
    normal: '#22c55e',
    warning: '#eab308',
    critical: '#ef4444',
  }[wasteAlertLevel] || '#22c55e';

  const icuPercent = icuTotal > 0 
    ? Math.round((icuAvailable / icuTotal) * 100) 
    : 0;

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap',
      marginBottom: '24px',
    }}>
      <SummaryCard
        label="Active Emergencies"
        value={activeEmergencies}
        subText={`${assignedEmergencies} assigned`}
        color={activeEmergencies > 5 ? '#ef4444' : '#f97316'}
      />
      <SummaryCard
        label="ICU Availability"
        value={`${icuAvailable}/${icuTotal}`}
        subText={`${icuPercent}% available`}
        color={icuPercent < 20 ? '#ef4444' : icuPercent < 50 ? '#eab308' : '#22c55e'}
      />
      <SummaryCard
        label="Waste Status"
        value={wasteAlertLevel.toUpperCase()}
        subText="System-wide"
        color={wasteColor}
      />
      <SummaryCard
        label="Events Received"
        value={totalEvents}
        subText="This session"
        color="#8b5cf6"
      />
    </div>
  );
}
