"use client";

import React, { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Polyline,
  Popup,
  Tooltip,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { type Ambulance, type ActiveTripInfo } from "@/lib/api";
import {
  CHENNAI_CENTER,
  CHENNAI_BOUNDS,
  HOSPITALS,
  TRAFFIC_SIGNALS,
  type Patient,
  type SignalState,
  type ChennaiMapProps,
} from "./ChennaiMap";

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom SVG ambulance icon generator
function createAmbulanceIcon(state: string, isSelected: boolean): L.DivIcon {
  const colors: Record<string, { bg: string; border: string }> = {
    AVAILABLE: { bg: "#10B981", border: "#059669" },
    DISPATCHED: { bg: "#3B82F6", border: "#2563EB" },
    HEADING_TO_ACCIDENT: { bg: "#F59E0B", border: "#D97706" },
    PATIENT_ONBOARD: { bg: "#EC4899", border: "#DB2777" },
    HEADING_TO_HOSPITAL: { bg: "#8B5CF6", border: "#7C3AED" },
    COMPLETED: { bg: "#14B8A6", border: "#0D9488" },
    OFFLINE: { bg: "#6B7280", border: "#4B5563" },
  };
  const color = colors[state] || colors.OFFLINE;
  const size = isSelected ? 44 : 36;
  const pulse = isSelected ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${color.bg}" opacity="0.3" class="animate-ping"/>` : "";
  
  return L.divIcon({
    className: "custom-ambulance-icon",
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        ${pulse}
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color.bg}" stroke="${color.border}" stroke-width="2"/>
        <text x="${size/2}" y="${size/2 + 4}" text-anchor="middle" fill="white" font-size="${size * 0.4}" font-weight="bold">🚑</text>
      </svg>
    `,
  });
}

// Patient marker icon
function createPatientIcon(severity: string): L.DivIcon {
  const colors: Record<string, { bg: string; border: string }> = {
    CRITICAL: { bg: "#DC2626", border: "#B91C1C" },
    HIGH: { bg: "#F97316", border: "#EA580C" },
    MODERATE: { bg: "#EAB308", border: "#CA8A04" },
    LOW: { bg: "#22C55E", border: "#16A34A" },
  };
  const color = colors[severity] || colors.MODERATE;
  
  return L.divIcon({
    className: "custom-patient-icon",
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
    html: `
      <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.163 0 0 7.163 0 16c0 10 14.5 23 15.5 24 .3.3.7.3 1 0C17.5 39 32 26 32 16 32 7.163 24.837 0 16 0z" fill="${color.bg}" stroke="${color.border}" stroke-width="2"/>
        <circle cx="16" cy="14" r="8" fill="white"/>
        <text x="16" y="18" text-anchor="middle" fill="${color.bg}" font-size="12" font-weight="bold">!</text>
      </svg>
    `,
  });
}

// Hospital marker icon
function createHospitalIcon(): L.DivIcon {
  return L.divIcon({
    className: "custom-hospital-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
    html: `
      <svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="32" height="32" rx="6" fill="#EF4444" stroke="#DC2626" stroke-width="2"/>
        <rect x="15" y="8" width="6" height="20" fill="white"/>
        <rect x="8" y="15" width="20" height="6" fill="white"/>
      </svg>
    `,
  });
}

// Map click handler component
function MapClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Component to handle map bounds and keep it stable
function MapController() {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      map.setMaxBounds([
        [CHENNAI_BOUNDS.minLat - 0.05, CHENNAI_BOUNDS.minLng - 0.05],
        [CHENNAI_BOUNDS.maxLat + 0.05, CHENNAI_BOUNDS.maxLng + 0.05],
      ]);
      map.setMinZoom(11);
      initializedRef.current = true;
    }
  }, [map]);

  return null;
}

// State colors helper
function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: "Available",
    DISPATCHED: "Dispatched",
    HEADING_TO_ACCIDENT: "Heading to Accident",
    PATIENT_ONBOARD: "Patient Onboard",
    HEADING_TO_HOSPITAL: "Heading to Hospital",
    COMPLETED: "Completed",
    OFFLINE: "Offline",
  };
  return labels[state] || state;
}

function getSeverityLabel(severity: string): string {
  const labels: Record<string, string> = {
    CRITICAL: "Critical",
    HIGH: "High Priority",
    MODERATE: "Moderate",
    LOW: "Low Priority",
  };
  return labels[severity] || severity;
}

export default function LeafletMap({
  ambulances,
  patients,
  signals,
  activeTrips,
  selectedAmbulanceId,
  onAmbulanceSelect,
  onPatientClick,
  onMapClick,
}: ChennaiMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  // Compute route for selected ambulance
  const selectedRoute = useMemo(() => {
    if (!selectedAmbulanceId) return null;
    
    const trip = activeTrips.find(
      (t) => t.ambulance_number === selectedAmbulanceId
    );
    if (!trip) return null;

    const routes: { path: [number, number][]; color: string; label: string }[] = [];
    
    // Current ambulance position
    const ambulance = ambulances.find(
      (a) => a.vehicle_number === selectedAmbulanceId
    );
    const ambLat = ambulance?.current_lat ?? trip.ambulance_lat ?? CHENNAI_CENTER.lat;
    const ambLng = ambulance?.current_lng ?? trip.ambulance_lng ?? CHENNAI_CENTER.lng;

    // Route to patient (amber) if not yet picked up
    if (trip.state === "DISPATCHED" || trip.state === "HEADING_TO_ACCIDENT") {
      if (trip.accident_lat != null && trip.accident_lng != null) {
        routes.push({
          path: [[ambLat, ambLng], [trip.accident_lat, trip.accident_lng]],
          color: "#F59E0B",
          label: "To Patient",
        });
      }
    }
    
    // Route to hospital (teal) if patient onboard
    if (trip.state === "PATIENT_ONBOARD" || trip.state === "HEADING_TO_HOSPITAL") {
      if (trip.hospital_lat != null && trip.hospital_lng != null) {
        routes.push({
          path: [[ambLat, ambLng], [trip.hospital_lat, trip.hospital_lng]],
          color: "#14B8A6",
          label: "To Hospital",
        });
      }
    }
    
    return routes;
  }, [selectedAmbulanceId, activeTrips, ambulances]);

  // Compute signals on the selected route (within proximity)
  const signalsOnRoute = useMemo(() => {
    if (!selectedRoute || selectedRoute.length === 0) return new Set<string>();
    
    const routeSignals = new Set<string>();
    
    // Simple proximity check - signal is on route if it's close to the line
    signals.forEach((signal) => {
      selectedRoute.forEach((route) => {
        const [start, end] = route.path;
        
        // Check if signal is within corridor of the route
        const dist = pointToLineDistance(
          signal.lat, signal.lng,
          start[0], start[1],
          end[0], end[1]
        );
        
        if (dist < 0.02) { // ~2km corridor
          routeSignals.add(signal.id);
        }
      });
    });
    
    return routeSignals;
  }, [selectedRoute, signals]);

  // Helper: distance from point to line segment
  function pointToLineDistance(
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) param = dot / len_sq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden shadow-xl border-2 border-teal-200 relative">
      {/* Map Legend */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 text-sm mb-2">Legend</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>Dispatched</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span>En Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-500"></span>
            <span>Patient Onboard</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span>Hospital</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gray-400 ring-2 ring-green-400"></span>
            <span>Signal (Green)</span>
          </div>
        </div>
      </div>

      <MapContainer
        center={[CHENNAI_CENTER.lat, CHENNAI_CENTER.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController />
        <MapClickHandler onClick={onMapClick} />

        {/* Routes for selected ambulance */}
        {selectedRoute?.map((route, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={route.path}
            pathOptions={{
              color: route.color,
              weight: 5,
              opacity: 0.8,
              dashArray: route.color === "#F59E0B" ? "10, 10" : undefined,
            }}
          >
            <Tooltip permanent={false}>{route.label}</Tooltip>
          </Polyline>
        ))}

        {/* Hospital markers */}
        {HOSPITALS.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.lat, hospital.lng]}
            icon={createHospitalIcon()}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-red-600 text-sm">{hospital.name}</h3>
                <div className="text-xs text-gray-600 mt-1">
                  <p>🛏️ Total Beds: {hospital.beds}</p>
                  <p>✅ Available: {hospital.available}</p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Traffic signals */}
        {signals.map((signal) => {
          const isOnRoute = signalsOnRoute.has(signal.id);
          const isGreen = signal.state === "GREEN";
          
          return (
            <CircleMarker
              key={signal.id}
              center={[signal.lat, signal.lng]}
              radius={isOnRoute ? 12 : 8}
              pathOptions={{
                color: isGreen ? "#22C55E" : "#EF4444",
                fillColor: isGreen ? "#4ADE80" : "#F87171",
                fillOpacity: 0.9,
                weight: isOnRoute ? 3 : 2,
                className: isOnRoute && isGreen ? "animate-pulse" : "",
              }}
            >
              <Tooltip>
                <div className="font-sans text-xs">
                  <p className="font-semibold">{signal.name}</p>
                  <p className={isGreen ? "text-green-600" : "text-red-600"}>
                    {isGreen ? "🟢 GREEN" : "🔴 RED"}
                  </p>
                  {isOnRoute && (
                    <p className="text-blue-600 font-medium mt-1">
                      ⚡ Traffic Signal Priority – Simulation Only
                    </p>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}

        {/* Patient markers */}
        {patients.map((patient) => (
          <Marker
            key={patient.id}
            position={[patient.lat, patient.lng]}
            icon={createPatientIcon(patient.severity)}
            eventHandlers={{
              click: () => onPatientClick(patient),
            }}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold text-gray-800 text-sm">{patient.name}</h3>
                <div className="mt-1 space-y-0.5 text-xs">
                  <p>
                    <span className="font-medium">Severity:</span>{" "}
                    <span className={
                      patient.severity === "CRITICAL" ? "text-red-600" :
                      patient.severity === "HIGH" ? "text-orange-600" :
                      patient.severity === "MODERATE" ? "text-yellow-600" :
                      "text-green-600"
                    }>
                      {getSeverityLabel(patient.severity)}
                    </span>
                  </p>
                  <p><span className="font-medium">Type:</span> {patient.emergencyType}</p>
                  {patient.description && (
                    <p className="text-gray-500">{patient.description}</p>
                  )}
                  {patient.assignedAmbulance && (
                    <p className="text-blue-600">
                      🚑 Assigned: {patient.assignedAmbulance}
                    </p>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ambulance markers */}
        {ambulances
          .filter((a) => a.current_lat != null && a.current_lng != null)
          .map((ambulance) => {
          const isSelected = ambulance.vehicle_number === selectedAmbulanceId;
          const trip = activeTrips.find(
            (t) => t.ambulance_number === ambulance.vehicle_number
          );
          
          return (
            <Marker
              key={ambulance.id}
              position={[ambulance.current_lat!, ambulance.current_lng!]}
              icon={createAmbulanceIcon(ambulance.state, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{
                click: () => {
                  onAmbulanceSelect(
                    isSelected ? null : ambulance.vehicle_number
                  );
                },
              }}
            >
              <Popup>
                <div className="font-sans">
                  <h3 className="font-bold text-gray-800 text-sm">
                    🚑 {ambulance.vehicle_number}
                  </h3>
                  <div className="mt-1 space-y-0.5 text-xs">
                    <p>
                      <span className="font-medium">Status:</span>{" "}
                      <span className={
                        ambulance.state === "AVAILABLE" ? "text-green-600" :
                        ambulance.state === "DISPATCHED" ? "text-blue-600" :
                        ambulance.state === "HEADING_TO_ACCIDENT" ? "text-amber-600" :
                        ambulance.state === "PATIENT_ONBOARD" ? "text-pink-600" :
                        "text-gray-600"
                      }>
                        {getStateLabel(ambulance.state)}
                      </span>
                    </p>
                    {trip && (
                      <>
                        <p className="text-gray-500">
                          ETA: {trip.eta_minutes} min
                        </p>
                        <p className="text-gray-500">
                          → {trip.destination}
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onAmbulanceSelect(ambulance.vehicle_number)}
                    className="mt-2 text-xs bg-teal-500 text-white px-2 py-1 rounded hover:bg-teal-600 transition-colors"
                  >
                    {isSelected ? "Deselect" : "Track Route"}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Active ambulance info overlay */}
      {selectedAmbulanceId && (
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm rounded-xl p-3 shadow-lg border border-teal-200 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-teal-700 text-sm">
              🚑 Tracking: {selectedAmbulanceId}
            </h4>
            <button
              onClick={() => onAmbulanceSelect(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          {selectedRoute && selectedRoute.length > 0 ? (
            <div className="text-xs text-gray-600 space-y-1">
              {selectedRoute.map((route, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="w-3 h-1 rounded"
                    style={{ backgroundColor: route.color }}
                  ></span>
                  <span>{route.label}</span>
                </div>
              ))}
              <p className="text-teal-600 mt-2">
                ⚡ Signal priority active (Simulation)
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No active route</p>
          )}
        </div>
      )}
    </div>
  );
}
