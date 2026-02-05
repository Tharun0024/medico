"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type TripPhase =
  | "DISPATCHED"
  | "HEADING_TO_ACCIDENT"
  | "PATIENT_ONBOARD"
  | "HEADING_TO_HOSPITAL"
  | "COMPLETED";

interface SignalInfo {
  id: string;
  state: "RED" | "GREEN";
  priority: boolean;
}

interface TripDetail {
  id: string;
  ambulanceId: string;
  ambulanceName: string;
  phase: TripPhase;
  etaMinutes: number;
  from: string;
  to: string;
  signals: SignalInfo[];
}

interface TripDetailModalProps {
  open: boolean;
  trip: TripDetail | null;
  onClose: () => void;
}

/* ---------------- HELPERS ---------------- */

const phaseLabel: Record<TripPhase, string> = {
  DISPATCHED: "Dispatched",
  HEADING_TO_ACCIDENT: "Heading to Accident",
  PATIENT_ONBOARD: "Patient Onboard",
  HEADING_TO_HOSPITAL: "Heading to Hospital",
  COMPLETED: "Completed",
};

const phaseColor: Record<TripPhase, string> = {
  DISPATCHED: "bg-blue-100 text-blue-700",
  HEADING_TO_ACCIDENT: "bg-amber-100 text-amber-700",
  PATIENT_ONBOARD: "bg-purple-100 text-purple-700",
  HEADING_TO_HOSPITAL: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-200 text-gray-700",
};

/* ---------------- COMPONENT ---------------- */

export default function TripDetailModal({
  open,
  trip,
  onClose,
}: TripDetailModalProps) {
  if (!trip) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-teal-700">
            Trip Details
          </DialogTitle>
        </DialogHeader>

        {/* Ambulance Info */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ambulance</span>
            <span className="font-medium">{trip.ambulanceName}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Trip ID</span>
            <span className="font-mono text-xs">{trip.id}</span>
          </div>
        </div>

        <Separator />

        {/* Status */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Current Status</span>
          <Badge className={phaseColor[trip.phase]}>
            {phaseLabel[trip.phase]}
          </Badge>
        </div>

        {/* ETA */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Estimated Arrival</span>
          <span className="font-medium">
            {trip.etaMinutes} mins
          </span>
        </div>

        <Separator />

        {/* Route */}
        <div className="space-y-1 text-sm">
          <p className="text-gray-600">Route</p>
          <p className="text-xs">
            <strong>From:</strong> {trip.from}
          </p>
          <p className="text-xs">
            <strong>To:</strong> {trip.to}
          </p>
        </div>

        <Separator />

        {/* Signals */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Traffic Signals on Route
          </p>

          {trip.signals.length === 0 ? (
            <p className="text-xs text-gray-500">
              No signals detected on this route
            </p>
          ) : (
            <div className="space-y-1">
              {trip.signals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex justify-between items-center text-xs border rounded px-2 py-1"
                >
                  <span>Signal {signal.id}</span>
                  <Badge
                    className={
                      signal.priority
                        ? "bg-green-500 text-white"
                        : signal.state === "GREEN"
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }
                  >
                    {signal.priority
                      ? "Priority (Green)"
                      : signal.state}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-gray-500 text-center pt-2">
          Signal behavior and trip data are simulated for demo purposes
        </p>
      </DialogContent>
    </Dialog>
  );
}
