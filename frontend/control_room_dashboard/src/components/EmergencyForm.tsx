"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type EmergencyPayload = {
  latitude: number;
  longitude: number;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
};

interface EmergencyFormProps {
  lat: number | null;
  lng: number | null;
  onCreateEmergency: (payload: EmergencyPayload) => void;
}

export default function EmergencyForm({
  lat,
  lng,
  onCreateEmergency,
}: EmergencyFormProps) {
  const [type, setType] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [submitting, setSubmitting] = useState(false);

  const isLocationSelected = lat !== null && lng !== null;

  const handleSubmit = async () => {
    if (!isLocationSelected || !type) return;

    setSubmitting(true);

    const payload: EmergencyPayload = {
      latitude: lat!,
      longitude: lng!,
      type,
      severity,
    };

    // 🔹 Delegate action upward (Control Room handles dispatch)
    onCreateEmergency(payload);

    // Optional reset (safe)
    setType("");
    setSeverity("MEDIUM");
    setSubmitting(false);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-teal-700">
          Create Emergency
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Location Info */}
        <div className="text-sm text-gray-600">
          {isLocationSelected ? (
            <span>
              📍 Location selected:{" "}
              <strong>{lat?.toFixed(5)}, {lng?.toFixed(5)}</strong>
            </span>
          ) : (
            <span className="text-red-600">
              Click on map to select emergency location
            </span>
          )}
        </div>

        {/* Emergency Type */}
        <div className="space-y-1">
          <Label>Emergency Type</Label>
          <Input
            placeholder="Accident / Cardiac / Trauma"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>

        {/* Severity */}
        <div className="space-y-1">
          <Label>Severity</Label>
          <Select
            value={severity}
            onValueChange={(value) =>
              setSeverity(value as "LOW" | "MEDIUM" | "HIGH")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Submit */}
        <Button
          className="w-full bg-teal-700 hover:bg-teal-800"
          disabled={!isLocationSelected || !type || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Creating..." : "Create & Dispatch"}
        </Button>

        {/* Simulation note */}
        <p className="text-xs text-gray-500 text-center">
          Emergency creation is simulated for demo purposes
        </p>
      </CardContent>
    </Card>
  );
}
