"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bed as BedType } from "@/lib/mock-data";

interface BedGridProps {
  beds: BedType[];
  onBedClick?: (bed: BedType) => void;
  selectedBedId?: string;
}

const statusConfig = {
  available: {
    color: "bg-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    label: "Available",
  },
  occupied: {
    color: "bg-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    label: "Occupied",
  },
  cleaning: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    label: "Cleaning",
  },
  reserved: {
    color: "bg-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    label: "Reserved",
  },
};

export function BedGrid({ beds, onBedClick, selectedBedId }: BedGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {beds.map((bed, index) => {
        const config = statusConfig[bed.status];
        const isSelected = bed.id === selectedBedId;

        return (
          <motion.button
            key={bed.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onBedClick?.(bed)}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all",
              config.bgColor,
              config.borderColor,
              isSelected && "ring-2 ring-primary ring-offset-2",
              bed.status === "available" && "cursor-pointer hover:shadow-md",
              bed.status !== "available" && "cursor-default"
            )}
          >
            {/* Bed Icon */}
            <div className="relative mb-2">
              <svg
                className={cn(
                  "h-8 w-8",
                  bed.status === "available" && "text-green-600 dark:text-green-400",
                  bed.status === "occupied" && "text-red-600 dark:text-red-400",
                  bed.status === "cleaning" && "text-yellow-600 dark:text-yellow-400",
                  bed.status === "reserved" && "text-blue-600 dark:text-blue-400"
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              {/* Status indicator */}
              <span
                className={cn(
                  "absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900",
                  config.color
                )}
              />
            </div>

            {/* Bed Number */}
            <span className="text-sm font-semibold text-foreground">{bed.number}</span>

            {/* Ward info */}
            <span className="text-[10px] text-muted-foreground">{bed.ward}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

interface BedLegendProps {
  className?: string;
}

export function BedLegend({ className }: BedLegendProps) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {Object.entries(statusConfig).map(([status, config]) => (
        <div key={status} className="flex items-center gap-2">
          <span className={cn("h-3 w-3 rounded-full", config.color)} />
          <span className="text-sm text-muted-foreground">{config.label}</span>
        </div>
      ))}
    </div>
  );
}

interface BedSummaryProps {
  beds: BedType[];
  className?: string;
}

export function BedSummary({ beds, className }: BedSummaryProps) {
  const summary = {
    available: beds.filter((b) => b.status === "available").length,
    occupied: beds.filter((b) => b.status === "occupied").length,
    cleaning: beds.filter((b) => b.status === "cleaning").length,
    reserved: beds.filter((b) => b.status === "reserved").length,
  };

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {Object.entries(summary).map(([status, count]) => {
        const config = statusConfig[status as keyof typeof statusConfig];
        return (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-4",
              config.bgColor,
              config.borderColor
            )}
          >
            <span className={cn("h-4 w-4 rounded-full", config.color)} />
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs capitalize text-muted-foreground">{status}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
