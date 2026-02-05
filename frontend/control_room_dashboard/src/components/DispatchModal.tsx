"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Ambulance = {
  id: string;
  name: string;
  status: "AVAILABLE" | "BUSY";
  eta: number; // minutes
};

interface DispatchModalProps {
  open: boolean;
  emergency: {
    latitude: number;
    longitude: number;
    type: string;
    severity: "LOW" | "MEDIUM" | "HIGH";
  } | null;
  ambulances: Ambulance[];
  onClose: () => void;
  onDispatch: (ambulanceId: string) => void;
}

export default function DispatchModal({
  open,
  emergency,
  ambulances,
  onClose,
  onDispatch,
}: DispatchModalProps) {
  if (!emergency) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-teal-700">
            Dispatch Ambulance
          </DialogTitle>
        </DialogHeader>

        {/* Emergency Info */}
        <div className="space-y-1 text-sm text-gray-700">
          <p>
            <strong>Type:</strong> {emergency.type}
          </p>
          <p>
            <strong>Severity:</strong>{" "}
            <Badge
              variant="outline"
              className={
                emergency.severity === "HIGH"
                  ? "border-red-600 text-red-600"
                  : emergency.severity === "MEDIUM"
                  ? "border-amber-500 text-amber-600"
                  : "border-green-600 text-green-600"
              }
            >
              {emergency.severity}
            </Badge>
          </p>
          <p>
            <strong>Location:</strong>{" "}
            {emergency.latitude.toFixed(4)}, {emergency.longitude.toFixed(4)}
          </p>
        </div>

        {/* Ambulance List */}
        <div className="mt-4 space-y-2">
          {ambulances.length === 0 ? (
            <p className="text-sm text-gray-500">
              No available ambulances
            </p>
          ) : (
            ambulances.map((amb) => (
              <div
                key={amb.id}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <div>
                  <p className="font-medium">{amb.name}</p>
                  <p className="text-xs text-gray-500">
                    ETA: {amb.eta} mins
                  </p>
                </div>

                <Button
                  size="sm"
                  disabled={amb.status !== "AVAILABLE"}
                  onClick={() => onDispatch(amb.id)}
                  className="bg-teal-700 hover:bg-teal-800"
                >
                  Dispatch
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 text-xs text-gray-500 text-center">
          Ambulance dispatch is simulated for demo purposes
        </div>
      </DialogContent>
    </Dialog>
  );
}