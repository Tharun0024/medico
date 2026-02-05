"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Ambulance,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Radio,
  Users,
  Navigation,
  Phone,
  Zap,
} from "lucide-react";
import Link from "next/link";

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface AmbulanceInfo {
  id: string;
  name: string;
  driver_name: string;
  status: string;
  lat: number;
  lng: number;
  last_updated: string;
}

interface DashboardOverview {
  total_hospitals: number;
  active_hospitals: number;
  total_ambulances: number;
  available_ambulances: number;
  active_emergencies: number;
  pending_emergencies: number;
  active_trips: number;
  total_beds: number;
  available_beds: number;
}

interface TripInfo {
  id: number;
  ambulance_id: string;
  emergency_id: number;
  hospital_id: number;
  status: string;
  pickup_lat?: number;
  pickup_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  created_at: string;
}

interface SignalInfo {
  id: number;
  name: string;
  lat: number;
  lng: number;
  state: string;
  controlled_by?: string;
}

interface EmergencyCase {
  id: number;
  severity: string;
  status: string;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
  created_at: string;
}

// Status color mappings
const ambulanceStatusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 border-green-300",
  busy: "bg-red-100 text-red-700 border-red-300",
  en_route: "bg-blue-100 text-blue-700 border-blue-300",
  offline: "bg-gray-100 text-gray-700 border-gray-300",
};

const tripStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  at_scene: "bg-orange-100 text-orange-700",
  patient_onboard: "bg-cyan-100 text-cyan-700",
  at_hospital: "bg-teal-100 text-teal-700",
  completed: "bg-green-100 text-green-700",
};

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  normal: "bg-green-100 text-green-700 border-green-300",
  low: "bg-blue-100 text-blue-700 border-blue-300",
};

// API Functions
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

export default function ControlRoomPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [ambulances, setAmbulances] = useState<AmbulanceInfo[]>([]);
  const [trips, setTrips] = useState<TripInfo[]>([]);
  const [signals, setSignals] = useState<SignalInfo[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Dispatch modal
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<EmergencyCase | null>(null);
  const [selectedAmbulance, setSelectedAmbulance] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewRes, ambulancesRes, tripsRes, signalsRes, emergenciesRes] = await Promise.all([
        fetchAPI<DashboardOverview>('/amb/dashboard/overview'),
        fetchAPI<{ ambulances: AmbulanceInfo[] }>('/amb/dashboard/ambulances'),
        fetchAPI<{ trips: TripInfo[] }>('/amb/dashboard/active-trips'),
        fetchAPI<{ signals: SignalInfo[] }>('/amb/dashboard/signals'),
        fetchAPI<{ cases: EmergencyCase[] }>('/amb/dashboard/pending-cases'),
      ]);
      
      setOverview(overviewRes);
      setAmbulances(ambulancesRes.ambulances || []);
      setTrips(tripsRes.trips || []);
      setSignals(signalsRes.signals || []);
      setEmergencies(emergenciesRes.cases || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch control room data:", err);
      setError("Failed to connect to backend. Using demo mode.");
      // Set demo data
      setOverview({
        total_hospitals: 8,
        active_hospitals: 7,
        total_ambulances: 8,
        available_ambulances: 5,
        active_emergencies: 3,
        pending_emergencies: 2,
        active_trips: 3,
        total_beds: 500,
        available_beds: 125,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleDispatch = async () => {
    if (!selectedEmergency || !selectedAmbulance) return;
    
    try {
      await fetchAPI('/amb/trips/emergencies', {
        method: 'POST',
        body: JSON.stringify({
          emergency_id: selectedEmergency.id,
          ambulance_id: selectedAmbulance,
          location_lat: selectedEmergency.location_lat || 13.0827,
          location_lng: selectedEmergency.location_lng || 80.2707,
        }),
      });
      setDispatchOpen(false);
      fetchData();
    } catch (err) {
      console.error("Dispatch failed:", err);
    }
  };

  const openDispatchModal = (emergency: EmergencyCase) => {
    setSelectedEmergency(emergency);
    setSelectedAmbulance(null);
    setDispatchOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Radio className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Control Room</h1>
              <p className="text-sm text-muted-foreground">
                Ambulance Dispatch & Traffic Signal Control
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Back to Portal
            </Button>
          </Link>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 mb-6 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Ambulance className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Ambulances</p>
                  <p className="text-xl font-bold">{overview.available_ambulances}/{overview.total_ambulances}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Emergencies</p>
                  <p className="text-xl font-bold">{overview.pending_emergencies}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Trips</p>
                  <p className="text-xl font-bold">{overview.active_trips}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Hospitals</p>
                  <p className="text-xl font-bold">{overview.active_hospitals}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-teal-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Available Beds</p>
                  <p className="text-xl font-bold">{overview.available_beds}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Signals</p>
                  <p className="text-xl font-bold">{signals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Emergencies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Pending Emergencies
            </CardTitle>
            <CardDescription>Cases awaiting dispatch</CardDescription>
          </CardHeader>
          <CardContent>
            {emergencies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No pending emergencies</p>
              </div>
            ) : (
              <div className="space-y-3">
                {emergencies.map((emergency) => (
                  <div
                    key={emergency.id}
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={severityColors[emergency.severity] || severityColors.normal}>
                        {emergency.severity?.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Emergency #{emergency.id}</p>
                        <p className="text-xs text-muted-foreground">{emergency.notes || "No details"}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDispatchModal(emergency)}
                    >
                      Dispatch
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ambulance Fleet */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ambulance className="h-5 w-5 text-purple-500" />
              Ambulance Fleet
            </CardTitle>
            <CardDescription>Real-time ambulance status</CardDescription>
          </CardHeader>
          <CardContent>
            {ambulances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ambulance className="h-8 w-8 mx-auto mb-2" />
                <p>No ambulances registered</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ambulances.slice(0, 6).map((amb) => (
                    <TableRow key={amb.id}>
                      <TableCell className="font-medium">{amb.id}</TableCell>
                      <TableCell>{amb.driver_name}</TableCell>
                      <TableCell>
                        <Badge className={ambulanceStatusColors[amb.status] || ambulanceStatusColors.offline}>
                          {amb.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {amb.lat?.toFixed(4)}, {amb.lng?.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Active Trips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Navigation className="h-5 w-5 text-blue-500" />
              Active Trips
            </CardTitle>
            <CardDescription>Ongoing ambulance trips</CardDescription>
          </CardHeader>
          <CardContent>
            {trips.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <p>No active trips</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={tripStatusColors[trip.status] || tripStatusColors.pending}>
                        {trip.status?.replace("_", " ").toUpperCase()}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">Trip #{trip.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {trip.ambulance_id} → Hospital #{trip.hospital_id}
                        </p>
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Traffic Signals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-orange-500" />
              Traffic Signal Status
            </CardTitle>
            <CardDescription>Signal priority control</CardDescription>
          </CardHeader>
          <CardContent>
            {signals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2" />
                <p>No signals in network</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {signals.slice(0, 8).map((signal) => (
                  <div
                    key={signal.id}
                    className={`p-2 rounded-lg border flex items-center gap-2 ${
                      signal.state === "GREEN" || signal.state === "green"
                        ? "bg-green-50 border-green-300"
                        : signal.state === "RED" || signal.state === "red"
                        ? "bg-red-50 border-red-300"
                        : "bg-yellow-50 border-yellow-300"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        signal.state === "GREEN" || signal.state === "green"
                          ? "bg-green-500"
                          : signal.state === "RED" || signal.state === "red"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    />
                    <span className="text-xs font-medium truncate">{signal.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch Modal */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Ambulance</DialogTitle>
          </DialogHeader>
          
          {selectedEmergency && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="font-medium">Emergency #{selectedEmergency.id}</p>
                <p className="text-sm text-muted-foreground">{selectedEmergency.notes}</p>
                <Badge className={severityColors[selectedEmergency.severity]}>
                  {selectedEmergency.severity?.toUpperCase()}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Select Available Ambulance:</p>
                <div className="space-y-2">
                  {ambulances
                    .filter((a) => a.status === "available")
                    .map((amb) => (
                      <div
                        key={amb.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedAmbulance === amb.id
                            ? "bg-purple-100 border-purple-500"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedAmbulance(amb.id)}
                      >
                        <div className="flex items-center gap-2">
                          <Ambulance className="h-4 w-4" />
                          <span className="font-medium">{amb.id}</span>
                          <span className="text-sm text-muted-foreground">- {amb.driver_name}</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDispatch}
              disabled={!selectedAmbulance}
            >
              Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
