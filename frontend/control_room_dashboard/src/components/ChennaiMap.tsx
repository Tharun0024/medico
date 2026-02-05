"use client";

import React from "react";
import dynamic from "next/dynamic";
import { type Ambulance, type ActiveTripInfo } from "@/lib/api";

// Chennai static data - exported for use in other components
export const CHENNAI_CENTER = { lat: 13.0827, lng: 80.2707 };
export const CHENNAI_BOUNDS = {
  minLat: 12.90,
  maxLat: 13.15,
  minLng: 80.12,
  maxLng: 80.32,
};

// Hospitals in Chennai
export const HOSPITALS = [
  { id: "H1", name: "Apollo Hospital, Greams Road", lat: 13.06, lng: 80.25, beds: 450, available: 45 },
  { id: "H2", name: "Govt General Hospital", lat: 13.08, lng: 80.28, beds: 1200, available: 120 },
  { id: "H3", name: "MIOT International", lat: 12.99, lng: 80.17, beds: 350, available: 30 },
  { id: "H4", name: "Fortis Malar Hospital", lat: 13.00, lng: 80.26, beds: 200, available: 25 },
  { id: "H5", name: "Kauvery Hospital", lat: 13.04, lng: 80.22, beds: 300, available: 40 },
  { id: "H6", name: "SIMS Hospital", lat: 13.10, lng: 80.20, beds: 250, available: 35 },
];

// Traffic signals at key junctions
export const TRAFFIC_SIGNALS = [
  { id: "SIG-001", name: "Anna Salai Junction", lat: 13.06, lng: 80.24 },
  { id: "SIG-002", name: "Kathipara Junction", lat: 13.00, lng: 80.20 },
  { id: "SIG-003", name: "T Nagar Signal", lat: 13.04, lng: 80.23 },
  { id: "SIG-004", name: "Adyar Signal", lat: 13.00, lng: 80.25 },
  { id: "SIG-005", name: "Guindy Junction", lat: 13.01, lng: 80.21 },
  { id: "SIG-006", name: "Velachery Junction", lat: 12.98, lng: 80.22 },
  { id: "SIG-007", name: "Mylapore Signal", lat: 13.03, lng: 80.27 },
  { id: "SIG-008", name: "Egmore Junction", lat: 13.07, lng: 80.26 },
];

// Patient type
export interface Patient {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  emergencyType: string;
  description?: string;
  reportedAt: string;
  assignedAmbulance?: string;
}

// Signal state
export interface SignalState {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state: "RED" | "GREEN";
  isPriority?: boolean;
}

export interface ChennaiMapProps {
  ambulances: Ambulance[];
  patients: Patient[];
  signals: SignalState[];
  activeTrips: ActiveTripInfo[];
  selectedAmbulanceId: string | null;
  onAmbulanceSelect: (id: string | null) => void;
  onPatientClick: (patient: Patient) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

// Dynamic import the actual map component to prevent SSR issues with Leaflet
const LeafletMapComponent = dynamic<ChennaiMapProps>(
  () => import("./LeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-teal-700 font-medium">Loading Chennai Map...</p>
        </div>
      </div>
    ),
  }
);

export function ChennaiMap(props: ChennaiMapProps) {
  return <LeafletMapComponent {...props} />;
}
