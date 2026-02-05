"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { RefreshCw, AlertCircle, Inbox } from "lucide-react";
import {
  dashboardAPI,
  tripAPI,
  type ActiveTripInfo,
} from "@/lib/api";

/* ---------------------------------- */
/* STATE COLOR MAPPING                 */
/* ---------------------------------- */

const stateColorMap: Record<string, string> = {
  DISPATCHED: "bg-blue-100 text-blue-700",
  HEADING_TO_ACCIDENT: "bg-amber-100 text-amber-700",
  HEADING_TO_SCENE: "bg-amber-100 text-amber-700",
  PATIENT_ONBOARD: "bg-purple-100 text-purple-700",
  HEADING_TO_HOSPITAL: "bg-green-100 text-green-700",
  AT_HOSPITAL: "bg-teal-100 text-teal-700",
  COMPLETED: "bg-gray-200 text-gray-700",
  CANCELLED: "bg-red-100 text-red-700",
};

/* ---------------------------------- */
/* TRIP DETAIL MODAL                   */
/* ---------------------------------- */

interface TripDetailModalProps {
  tripId: string | null;
  onClose: () => void;
}

function TripDetailModal({ tripId, onClose }: TripDetailModalProps) {
  const [tripDetail, setTripDetail] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTripDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await tripAPI.get(tripId);
        setTripDetail(detail as Record<string, unknown>);
      } catch (err) {
        console.error("Failed to fetch trip detail:", err);
        setError("Failed to load trip details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [tripId]);

  if (!tripId) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Trip Details: {tripId}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-600 py-4">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}
          {tripDetail && !loading && !error && (
            <div className="space-y-3 text-sm">
              {Object.entries(tripDetail).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium text-right max-w-[60%] truncate">
                    {value === null || value === undefined
                      ? "—"
                      : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------------------------- */
/* MAIN PAGE                           */
/* ---------------------------------- */

export default function ActiveTripsPage() {
  const [trips, setTrips] = useState<ActiveTripInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /* ---------------------------------- */
  /* DATA FETCH                          */
  /* ---------------------------------- */

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeTrips = await dashboardAPI.getActiveTrips();
      setTrips(activeTrips);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch active trips:", err);
      setError("Failed to connect to backend. Please check if the server is running.");
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchTrips, 10000);
    return () => clearInterval(interval);
  }, [fetchTrips]);

  /* ---------------------------------- */
  /* RENDER                             */
  /* ---------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Active Trips</h2>
          <p className="text-sm text-muted-foreground">
            Real-time ambulance trip tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrips}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Connection Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && trips.length === 0 && !error && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Loading active trips...</span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && trips.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Active Trips</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are currently no ambulances on active dispatch.
            </p>
          </CardContent>
        </Card>
      )}

      {/* TRIPS TABLE */}
      {trips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚑 Active Trips ({trips.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trip ID</TableHead>
                  <TableHead>Ambulance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Emergency Type</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => (
                  <TableRow key={trip.trip_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">
                      {trip.trip_id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {trip.ambulance_number || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={stateColorMap[trip.state] || "bg-gray-100 text-gray-700"}>
                        {trip.state?.replace(/_/g, " ") || "UNKNOWN"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {trip.emergency_type || "—"}
                    </TableCell>
                    <TableCell>
                      {trip.destination || "—"}
                    </TableCell>
                    <TableCell>
                      {trip.eta_minutes !== undefined && trip.eta_minutes !== null
                        ? `${trip.eta_minutes} min`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTripId(trip.trip_id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* TRIP DETAIL MODAL */}
      <TripDetailModal
        tripId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
      />
    </div>
  );
}
