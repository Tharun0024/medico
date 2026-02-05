"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type TripPhase =
  | "DISPATCHED"
  | "HEADING_TO_ACCIDENT"
  | "PATIENT_ONBOARD"
  | "HEADING_TO_HOSPITAL"
  | "COMPLETED";

interface ActiveTrip {
  id: string;
  ambulanceId: string;
  ambulanceName: string;
  phase: TripPhase;
  etaMinutes: number;
  from: string;
  to: string;
}

interface ActiveTripCardProps {
  trip: ActiveTrip;
}

const phaseLabelMap: Record<TripPhase, string> = {
  DISPATCHED: "Dispatched",
  HEADING_TO_ACCIDENT: "Heading to Accident",
  PATIENT_ONBOARD: "Patient Onboard",
  HEADING_TO_HOSPITAL: "Heading to Hospital",
  COMPLETED: "Completed",
};

const phaseColorMap: Record<TripPhase, string> = {
  DISPATCHED: "bg-blue-100 text-blue-700",
  HEADING_TO_ACCIDENT: "bg-amber-100 text-amber-700",
  PATIENT_ONBOARD: "bg-purple-100 text-purple-700",
  HEADING_TO_HOSPITAL: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-200 text-gray-700",
};

export default function ActiveTripCard({ trip }: ActiveTripCardProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-teal-700 text-lg">
          Active Trip
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        {/* Ambulance */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Ambulance</span>
          <span className="font-medium">{trip.ambulanceName}</span>
        </div>

        {/* Phase */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status</span>
          <Badge className={phaseColorMap[trip.phase]}>
            {phaseLabelMap[trip.phase]}
          </Badge>
        </div>

        {/* ETA */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">ETA</span>
          <span className="font-medium">
            {trip.etaMinutes} mins
          </span>
        </div>

        {/* Route */}
        <div className="space-y-1">
          <p className="text-gray-600">Route</p>
          <p className="text-xs">
            <strong>From:</strong> {trip.from}
          </p>
          <p className="text-xs">
            <strong>To:</strong> {trip.to}
          </p>
        </div>

        {/* Footer note */}
        <p className="text-xs text-gray-500 pt-1">
          Trip status updates are simulated for demo purposes
        </p>
      </CardContent>
    </Card>
  );
}