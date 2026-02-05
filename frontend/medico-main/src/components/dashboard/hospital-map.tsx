"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Hospital } from "@/lib/mock-data";
import { MapPin } from "lucide-react";

interface HospitalMapProps {
  hospitals: Hospital[];
  selectedHospitalId?: string;
  onHospitalSelect?: (hospital: Hospital) => void;
  className?: string;
}

export function HospitalMap({
  hospitals,
  selectedHospitalId,
  onHospitalSelect,
  className,
}: HospitalMapProps) {
  // Calculate bounds for positioning
  const minLat = Math.min(...hospitals.map((h) => h.lat));
  const maxLat = Math.max(...hospitals.map((h) => h.lat));
  const minLng = Math.min(...hospitals.map((h) => h.lng));
  const maxLng = Math.max(...hospitals.map((h) => h.lng));

  const getPosition = (hospital: Hospital) => {
    const x = ((hospital.lng - minLng) / (maxLng - minLng)) * 80 + 10;
    const y = ((maxLat - hospital.lat) / (maxLat - minLat)) * 80 + 10;
    return { x, y };
  };

  return (
    <div
      className={cn(
        "relative h-[400px] w-full overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
        className
      )}
    >
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Decorative circles */}
      <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl" />

      {/* Hospital markers */}
      {hospitals.map((hospital) => {
        const { x, y } = getPosition(hospital);
        const isSelected = hospital.id === selectedHospitalId;
        const bedPercentage = (hospital.availableBeds / hospital.totalBeds) * 100;

        return (
          <motion.button
            key={hospital.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onHospitalSelect?.(hospital)}
            style={{ left: `${x}%`, top: `${y}%` }}
            className={cn(
              "group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer",
              "transition-all duration-200"
            )}
          >
            {/* Pulse animation for selected */}
            {isSelected && (
              <motion.div
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}

            {/* Marker */}
            <div
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg transition-all",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : bedPercentage > 30
                  ? "border-green-500 bg-green-500 text-white"
                  : bedPercentage > 10
                  ? "border-yellow-500 bg-yellow-500 text-white"
                  : "border-red-500 bg-red-500 text-white"
              )}
            >
              <MapPin className="h-5 w-5" />
            </div>

            {/* Tooltip */}
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 text-sm shadow-xl",
                "opacity-0 transition-opacity group-hover:opacity-100"
              )}
            >
              <p className="font-semibold">{hospital.name}</p>
              <p className="text-xs text-muted-foreground">{hospital.location}</p>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    bedPercentage > 30 ? "bg-green-500" : bedPercentage > 10 ? "bg-yellow-500" : "bg-red-500"
                  )}
                />
                <span>
                  {hospital.availableBeds}/{hospital.totalBeds} beds available
                </span>
              </div>
            </div>
          </motion.button>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 rounded-lg border border-border/50 bg-background/90 p-3 backdrop-blur-sm">
        <p className="text-xs font-medium">Bed Availability</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <span>{"> 30%"}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
          <span>10-30%</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span>{"< 10%"}</span>
        </div>
      </div>

      {/* Map label */}
      <div className="absolute right-4 top-4 rounded-lg border border-border/50 bg-background/90 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
        Interactive Hospital Map
      </div>
    </div>
  );
}
