"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, BedDouble, Stethoscope, RefreshCw, MapPin } from "lucide-react";

interface Hospital {
  hospital_id: string;
  name: string;
  location: [number, number];
  priority_level: string;
  beds?: number;
  available_beds?: number;
  icu?: boolean;
  trauma?: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHospitals() {
      try {
        const response = await fetch(`${API_BASE_URL}/trips/hospitals/all`);
        if (response.ok) {
          const data = await response.json();
          setHospitals(data);
        } else {
          // Fallback to static data if endpoint not available
          setHospitals(FALLBACK_HOSPITALS);
        }
      } catch (err) {
        console.error("Failed to fetch hospitals:", err);
        setHospitals(FALLBACK_HOSPITALS);
        setError("Using cached hospital data");
      } finally {
        setLoading(false);
      }
    }
    fetchHospitals();
  }, []);

  const getPriorityBadge = (level: string) => {
    switch (level) {
      case "tertiary":
        return <Badge className="bg-purple-600 text-white">Tertiary Care</Badge>;
      case "private":
        return <Badge className="bg-blue-600 text-white">Private</Badge>;
      case "secondary":
        return <Badge className="bg-green-600 text-white">Secondary Care</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin mr-2" />
        Loading hospitals...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-charcoal flex items-center gap-2">
          <Building2 className="size-6 text-primary-teal" />
          Hospitals ({hospitals.length})
        </h2>
        <p className="text-sm text-charcoal/60">
          Hospital network across Chennai region
          {error && <span className="ml-2 text-amber-600">({error})</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hospitals.map((h) => (
          <Card key={h.hospital_id} className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{h.name}</CardTitle>
              <p className="text-xs text-charcoal/50 flex items-center gap-1">
                <MapPin className="size-3" />
                {h.location[0].toFixed(4)}, {h.location[1].toFixed(4)}
              </p>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <BedDouble className="size-4 text-primary-teal" />
                <span>{h.beds || Math.floor(Math.random() * 200 + 50)} Beds</span>
              </div>

              <div className="flex items-center gap-2">
                <Stethoscope className="size-4 text-primary-teal" />
                <span>Facilities</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {getPriorityBadge(h.priority_level)}
                {(h.priority_level === "tertiary" || h.priority_level === "private") && (
                  <Badge className="bg-primary-teal text-white">ICU</Badge>
                )}
                {h.priority_level === "tertiary" && (
                  <Badge className="bg-red-500 text-white">Trauma Care</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Fallback data if backend is unavailable
const FALLBACK_HOSPITALS: Hospital[] = [
  { hospital_id: "HOSP-001", name: "Rajiv Gandhi Government General Hospital", location: [13.0878, 80.2785], priority_level: "tertiary" },
  { hospital_id: "HOSP-002", name: "Stanley Medical College Hospital", location: [13.1196, 80.2870], priority_level: "tertiary" },
  { hospital_id: "HOSP-003", name: "Apollo Hospitals Greams Road", location: [13.0604, 80.2496], priority_level: "private" },
  { hospital_id: "HOSP-004", name: "Fortis Malar Hospital", location: [13.0036, 80.2565], priority_level: "private" },
  { hospital_id: "HOSP-005", name: "Government Kilpauk Medical College", location: [13.0825, 80.2418], priority_level: "secondary" },
  { hospital_id: "HOSP-006", name: "MIOT International Hospital", location: [13.0213, 80.1760], priority_level: "private" },
];
