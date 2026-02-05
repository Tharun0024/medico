"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChennaiMap, type Patient, type SignalState, TRAFFIC_SIGNALS } from "@/components/ChennaiMap";
import { PatientAssignmentModal } from "@/components/PatientAssignmentModal";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
} from "lucide-react";
import {
  dashboardAPI,
  emergencyAPI,
  tripAPI,
  systemAPI,
  healthAPI,
  type Ambulance as AmbulanceType,
  type DashboardOverview,
  type ActiveTripInfo,
  type SystemStatus,
} from "@/lib/api";

/* ---------------------------------- */
/* DEMO PATIENTS (SIMULATION MODE)     */
/* ---------------------------------- */

const DEMO_PATIENTS: Patient[] = [
  {
    id: "PAT-001",
    name: "Emergency Case 1",
    lat: 13.0627,
    lng: 80.2357,
    severity: "CRITICAL",
    emergencyType: "Cardiac Arrest",
    description: "65 year old male, chest pain",
    reportedAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: "PAT-002",
    name: "Emergency Case 2",
    lat: 13.0312,
    lng: 80.2518,
    severity: "HIGH",
    emergencyType: "Road Accident",
    description: "Multiple injuries",
    reportedAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "PAT-003",
    name: "Emergency Case 3",
    lat: 12.9956,
    lng: 80.2235,
    severity: "MODERATE",
    emergencyType: "Fall Injury",
    description: "Elderly female, hip injury",
    reportedAt: new Date(Date.now() - 900000).toISOString(),
  },
];

/* ---------------------------------- */
/* MAIN PAGE                           */
/* ---------------------------------- */

export default function ControlRoomPage() {
  const [ambulances, setAmbulances] = useState<AmbulanceType[]>([]);
  const [patients, setPatients] = useState<Patient[]>(DEMO_PATIENTS);
  const [activeTrips, setActiveTrips] = useState<ActiveTripInfo[]>([]);
  const [signals, setSignals] = useState<SignalState[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);

  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  
  // System status and health
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<{ status: string } | null>(null);

  /* ---------------------------------- */
  /* SIGNAL INITIALIZATION               */
  /* ---------------------------------- */

  // Signals are now fetched from backend in fetchData

  /* ---------------------------------- */
  /* DATA FETCH                          */
  /* ---------------------------------- */

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [amb, over, trips, backendSignals, pendingCases, sysStatus, health] = await Promise.all([
        dashboardAPI.getAllAmbulances(),
        dashboardAPI.getOverview(),
        dashboardAPI.getActiveTrips(),
        dashboardAPI.getAllSignals().catch(() => null),
        dashboardAPI.getPendingCases().catch(() => null),
        systemAPI.getStatus().catch(() => null),
        healthAPI.check().catch(() => null),
      ]);

      setAmbulances(amb);
      setOverview(over);
      setActiveTrips(trips);
      setSystemStatus(sysStatus);
      setHealthStatus(health);
      
      // Map backend signals to frontend format
      if (backendSignals && Array.isArray(backendSignals)) {
        setSignals(backendSignals.map((s: { id: string; name: string; lat: number; lng: number; state: string; is_priority?: boolean }) => ({
          id: s.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          state: s.state === "GREEN_FOR_AMBULANCE" || s.state === "GREEN" ? "GREEN" as const : "RED" as const,
          isPriority: s.is_priority || s.state === "GREEN_FOR_AMBULANCE",
        })));
      } else {
        // Initialize with default signals if backend doesn't have them
        setSignals(
          TRAFFIC_SIGNALS.map((s: { id: string; name: string; lat: number; lng: number }) => ({
            ...s,
            state: "RED" as const,
            isPriority: false,
          }))
        );
      }
      
      // Map pending cases to patients
      if (pendingCases && Array.isArray(pendingCases)) {
        const mappedPatients: Patient[] = pendingCases.map((c: {
          id?: string;
          emergency_id?: string;
          location_lat?: number;
          location_lng?: number;
          severity?: string;
          emergency_type?: string;
          description?: string;
          created_at?: string;
          assigned_ambulance?: string;
        }) => ({
          id: c.id || c.emergency_id || `EMG-${Date.now()}`,
          name: `Emergency Case`,
          lat: c.location_lat || 13.05,
          lng: c.location_lng || 80.25,
          severity: (c.severity as Patient["severity"]) || "HIGH",
          emergencyType: c.emergency_type || "Emergency",
          description: c.description || "Emergency reported",
          reportedAt: c.created_at || new Date().toISOString(),
          assignedAmbulance: c.assigned_ambulance,
        }));
        
        // Merge with demo patients if backend has none
        if (mappedPatients.length > 0) {
          setPatients(mappedPatients);
        } else {
          setPatients(DEMO_PATIENTS);
        }
      }
      
      setDemoMode(false);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError("Failed to connect to backend. Running in simulation mode.");
      // DEMO FALLBACK
      setDemoMode(true);
      setSystemStatus(null);
      setHealthStatus(null);

      setAmbulances([
        { id: "AMB-001", vehicle_number: "TN01A1234", state: "AVAILABLE", current_lat: 13.06, current_lng: 80.22, equipment_level: "ALS" },
        { id: "AMB-002", vehicle_number: "TN01A2345", state: "DISPATCHED", current_lat: 13.04, current_lng: 80.24, equipment_level: "BLS" },
        { id: "AMB-003", vehicle_number: "TN01A3456", state: "AVAILABLE", current_lat: 13.02, current_lng: 80.20, equipment_level: "ALS" },
        { id: "AMB-004", vehicle_number: "TN01A4567", state: "PATIENT_ONBOARD", current_lat: 13.03, current_lng: 80.26, equipment_level: "BLS" },
        { id: "AMB-005", vehicle_number: "TN01A5678", state: "AVAILABLE", current_lat: 13.08, current_lng: 80.23, equipment_level: "ALS" },
      ]);

      setActiveTrips([
        {
          trip_id: "TRIP-001",
          ambulance_number: "TN01A2345",
          state: "HEADING_TO_ACCIDENT",
          destination: "Cardiac Arrest",
          eta_minutes: 5,
          accident_lat: 13.0627,
          accident_lng: 80.2357,
          hospital_lat: 13.06,
          hospital_lng: 80.25,
        },
        {
          trip_id: "TRIP-002",
          ambulance_number: "TN01A4567",
          state: "HEADING_TO_HOSPITAL",
          destination: "Apollo Hospital",
          eta_minutes: 8,
          accident_lat: 13.0312,
          accident_lng: 80.2518,
          hospital_lat: 13.06,
          hospital_lng: 80.25,
        },
      ]);

      setOverview({
        total_ambulances: 5,
        available_ambulances: 3,
        active_trips: 2,
        completed_today: 12,
        total_signals: TRAFFIC_SIGNALS.length,
        preempted_signals: 2,
      });
      
      // Initialize demo signals
      setSignals(
        TRAFFIC_SIGNALS.map((s: { id: string; name: string; lat: number; lng: number }) => ({
          ...s,
          state: Math.random() > 0.5 ? "GREEN" as const : "RED" as const,
          isPriority: false,
        }))
      );

      // Use demo patients
      setPatients(DEMO_PATIENTS.map((p, idx) => {
        if (idx === 0) return { ...p, assignedAmbulance: "TN01A2345" };
        if (idx === 1) return { ...p, assignedAmbulance: "TN01A4567" };
        return p;
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 5000);
    return () => clearInterval(i);
  }, [fetchData]);

  /* ---------------------------------- */
  /* SIGNAL PRIORITY LINKING             */
  /* ---------------------------------- */

  useEffect(() => {
    if (!selectedAmbulanceId) {
      setSignals(s => s.map(sig => ({ ...sig, isPriority: false })));
      return;
    }

    const trip = activeTrips.find(t => t.ambulance_number === selectedAmbulanceId);
    if (!trip) return;

    setSignals(prev =>
      prev.map(sig => ({
        ...sig,
        isPriority:
          Math.abs(sig.lat - (trip.accident_lat ?? 0)) < 0.02 &&
          Math.abs(sig.lng - (trip.accident_lng ?? 0)) < 0.02,
      }))
    );
  }, [selectedAmbulanceId, activeTrips]);

  /* ---------------------------------- */
  /* HANDLERS                            */
  /* ---------------------------------- */

  const handlePatientClick = (p: Patient) => {
    if (p.assignedAmbulance) {
      setSelectedAmbulanceId(p.assignedAmbulance);
    } else {
      setSelectedPatient(p);
      setAssignOpen(true);
    }
  };

  const handleAssign = async (patientId: string, ambulanceId: string, hospitalId: string) => {
    try {
      // Find the patient to get location info
      const patient = patients.find(p => p.id === patientId);
      
      let emergencyId = patientId;
      
      // If patient doesn't have an emergency ID from backend, create one
      if (patient && !patientId.startsWith('EMG-')) {
        const emergency = await emergencyAPI.create({
          location_lat: patient.lat,
          location_lng: patient.lng,
          location_address: patient.name,
          emergency_type: patient.emergencyType,
          severity: patient.severity,
          description: patient.description,
        }) as { id?: string; emergency_id?: string };
        emergencyId = emergency.id || emergency.emergency_id || patientId;
      }

      // Create trip via backend API
      await tripAPI.create(emergencyId, ambulanceId, hospitalId);

      // Update local state optimistically
      setPatients(p =>
        p.map(pt => pt.id === patientId ? { ...pt, assignedAmbulance: ambulanceId } : pt)
      );

      setAmbulances(a =>
        a.map(am => am.id === ambulanceId ? { ...am, state: "DISPATCHED" as const } : am)
      );

      setSelectedAmbulanceId(ambulanceId);
      setNotifications(n => [`Ambulance ${ambulanceId} dispatched`, ...n.slice(0, 3)]);

      // Refresh data from backend
      await fetchData();
    } catch (error) {
      console.error("Failed to dispatch ambulance:", error);
      setNotifications(n => [`Dispatch failed: ${error}`, ...n.slice(0, 3)]);
    }
  };

  /* ---------------------------------- */
  /* RENDER                             */
  /* ---------------------------------- */

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <RefreshCw className="animate-spin mr-2" /> Loading Control Room...
      </div>
    );
  }

  const pendingPatients = patients.filter(p => !p.assignedAmbulance);
  const availableAmbulances = ambulances.filter(a => a.state === "AVAILABLE");

  return (
    <div className="space-y-6 p-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Control Room Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Chennai Emergency Dispatch System
          </p>
        </div>
        <div className="flex items-center gap-3">
          {notifications.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {notifications[0]}
            </Badge>
          )}
          {/* Health Status Indicator */}
          {healthStatus && (
            <Badge className={healthStatus.status === "ok" ? "bg-green-600" : "bg-red-600"}>
              API: {healthStatus.status.toUpperCase()}
            </Badge>
          )}
          <Badge className={demoMode ? "bg-amber-500" : "bg-green-600"}>
            {demoMode ? "Simulation Mode" : "System Live"}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* STATS CARDS */}
      {overview ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Ambulances" value={overview.total_ambulances} color="bg-blue-600" />
          <StatCard label="Available" value={overview.available_ambulances} color="bg-green-600" />
          <StatCard label="Active Trips" value={overview.active_trips} color="bg-amber-500" />
          <StatCard label="Traffic Signals" value={overview.total_signals} color="bg-purple-600" />
        </div>
      ) : (
        <div className="bg-gray-100 border border-gray-300 rounded-lg p-6 text-center text-gray-500">
          No overview data available
        </div>
      )}

      {/* SYSTEM STATUS PANEL */}
      {systemStatus && (
        <Card className="border-gray-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              🖥️ System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Active Ambulances</p>
                <p className="font-semibold">{systemStatus.active_ambulances?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Locked Resources</p>
                <p className="font-semibold">{Object.keys(systemStatus.locked_resources ?? {}).length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Suppressed Ambulances</p>
                <p className="font-semibold">{systemStatus.suppressed_ambulances?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recent Conflicts</p>
                <p className="font-semibold">{systemStatus.log_preview?.length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAP + SIDE PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* MAP */}
        <div className="lg:col-span-2 h-[560px]">
          <ChennaiMap
            ambulances={ambulances}
            patients={patients}
            signals={signals}
            activeTrips={activeTrips}
            selectedAmbulanceId={selectedAmbulanceId}
            onAmbulanceSelect={setSelectedAmbulanceId}
            onPatientClick={handlePatientClick}
          />
        </div>

        {/* SIDE */}
        <div className="space-y-4">

          {/* PENDING */}
          {pendingPatients.length > 0 && (
            <Card className="border-red-300">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  ⚠️ Pending Emergencies ({pendingPatients.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingPatients.map(p => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="w-full justify-start text-left"
                    onClick={() => handlePatientClick(p)}
                  >
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      p.severity === "CRITICAL" ? "bg-red-500" :
                      p.severity === "HIGH" ? "bg-orange-500" :
                      p.severity === "MODERATE" ? "bg-yellow-500" :
                      "bg-green-500"
                    }`} />
                    {p.emergencyType} — {p.severity}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ACTIVE TRIPS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🚑 Active Trips ({activeTrips.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeTrips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active trips</p>
              ) : (
                activeTrips.map(t => (
                  <div
                    key={t.trip_id}
                    onClick={() => setSelectedAmbulanceId(t.ambulance_number)}
                    className={`cursor-pointer p-3 rounded-lg border transition-colors ${
                      selectedAmbulanceId === t.ambulance_number
                        ? "bg-teal-50 border-teal-300"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{t.ambulance_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {t.eta_minutes} min
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.state.replace(/_/g, " ")} → {t.destination}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* AVAILABLE AMBULANCES */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ✅ Available ({availableAmbulances.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {availableAmbulances.length === 0 ? (
                <p className="text-sm text-muted-foreground">All ambulances busy</p>
              ) : (
                availableAmbulances.map(a => (
                  <div
                    key={a.id}
                    className="p-2 rounded border text-sm flex justify-between items-center"
                  >
                    <span>{a.vehicle_number}</span>
                    <Badge className="bg-green-500 text-xs">Ready</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ASSIGN MODAL */}
      <PatientAssignmentModal
        patient={selectedPatient}
        ambulances={availableAmbulances}
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        onAssign={handleAssign}
      />
    </div>
  );
}

/* ---------------------------------- */
/* STAT CARD COMPONENT                 */
/* ---------------------------------- */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card className={`${color} text-white border-none`}>
      <CardContent className="p-4 text-center">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs opacity-80">{label}</p>
      </CardContent>
    </Card>
  );
}
