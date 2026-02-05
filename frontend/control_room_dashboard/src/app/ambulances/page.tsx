"use client";

import { useEffect, useState } from "react";
import { ambulanceAPI, type Ambulance } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ambulance as AmbulanceIcon } from "lucide-react";

export default function AmbulancesPage() {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);

  useEffect(() => {
    ambulanceAPI.getAll().then(setAmbulances);
  }, []);

  const statusColor = (state: string) => {
    switch (state) {
      case "AVAILABLE":
        return "bg-green-500";
      case "DISPATCHED":
      case "HEADING_TO_ACCIDENT":
        return "bg-amber-500";
      case "PATIENT_ONBOARD":
      case "HEADING_TO_HOSPITAL":
        return "bg-primary-teal";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-charcoal flex items-center gap-2">
          <AmbulanceIcon className="size-6 text-primary-teal" />
          Ambulance Fleet
        </h2>
        <p className="text-sm text-charcoal/60">
          Real-time ambulance status (Simulation)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ambulances.map((amb) => (
          <Card key={amb.id} className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {amb.vehicle_number}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span
                  className={`size-3 rounded-full ${statusColor(amb.state)}`}
                />
                <span>{amb.state.replace(/_/g, " ")}</span>
              </div>

              <p className="text-xs text-charcoal/60">
                Equipment: {amb.equipment_level}
              </p>

              <Badge variant="outline" className="text-[10px]">
                Ambulance ID: {amb.id}
              </Badge>

              <p className="text-xs text-gray-500 pt-2">
                Live state is simulated for demo
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
