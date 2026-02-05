"use client";

import { Info } from "lucide-react";
import { DEMO_MODE } from "@/lib/api/client";

export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-white shadow-lg">
      <Info className="h-4 w-4" />
      <span className="text-sm font-medium">Demo Mode</span>
      <span className="text-xs opacity-80">• Using mock data</span>
    </div>
  );
}
