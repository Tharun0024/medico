import React, { useEffect, useRef } from 'react';

const containerStyle = {
  background: '#1e293b',
  borderRadius: '8px',
  padding: '16px',
  height: '500px',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
  paddingBottom: '12px',
  borderBottom: '1px solid #334155',
};

const titleStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#e2e8f0',
};

const listStyle = {
  flex: 1,
  overflowY: 'auto',
  fontFamily: 'monospace',
  fontSize: '12px',
};

const eventStyle = {
  padding: '8px 12px',
  borderRadius: '4px',
  marginBottom: '4px',
  background: '#0f172a',
  borderLeft: '3px solid #3b82f6',
};

const EVENT_COLORS = {
  'emergency.created': '#f97316',
  'emergency.assigned': '#22c55e',
  'emergency.resolved': '#8b5cf6',
  'emergency.failed': '#ef4444',
  'bed.reserved': '#eab308',
  'bed.released': '#06b6d4',
  'bed.occupancy.updated': '#64748b',
  'waste.generated': '#a855f7',
  'waste.threshold.warning': '#eab308',
  'waste.threshold.critical': '#ef4444',
  'connected': '#22d3ee',
};

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function EventItem({ event }) {
  const color = EVENT_COLORS[event.type] || '#64748b';
  const time = formatTime(event.timestamp);
  
  // Format payload for display
  const payloadStr = event.payload 
    ? Object.entries(event.payload)
        .slice(0, 4)
        .map(([k, v]) => `${k}=${typeof v === 'object' ? '...' : v}`)
        .join(' ')
    : '';

  return (
    <div style={{ ...eventStyle, borderLeftColor: color }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color, fontWeight: '600' }}>{event.type}</span>
        <span style={{ color: '#64748b' }}>{time}</span>
      </div>
      {payloadStr && (
        <div style={{ color: '#94a3b8', fontSize: '11px' }}>{payloadStr}</div>
      )}
    </div>
  );
}

export default function EventStream({ events, connected }) {
  const listRef = useRef(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events.length]);

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <span style={titleStyle}>📡 Event Stream</span>
        <span style={{
          fontSize: '12px',
          padding: '4px 8px',
          borderRadius: '4px',
          background: connected ? '#166534' : '#991b1b',
          color: connected ? '#86efac' : '#fca5a5',
        }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      <div ref={listRef} style={listStyle}>
        {events.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', paddingTop: '40px' }}>
            Waiting for events...
          </div>
        ) : (
          events.map((event, idx) => (
            <EventItem key={event.event_id || idx} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
