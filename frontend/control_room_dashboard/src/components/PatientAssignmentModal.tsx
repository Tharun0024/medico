"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Ambulance as AmbIcon,
  Clock,
  MapPin,
  AlertTriangle,
  Navigation,
  Check,
  Loader2,
  Building2,
  ChevronLeft,
} from "lucide-react";
import { type Patient, HOSPITALS } from "./ChennaiMap";
import { type Ambulance } from "@/lib/api";

// Hospital type for type safety
interface HospitalWithDistance {
  id: string;
  name: string;
  lat: number;
  lng: number;
  beds: number;
  available: number;
  distance: number;
  eta: number;
}

interface PatientAssignmentModalProps {
  patient: Patient | null;
  ambulances: Ambulance[];
  isOpen: boolean;
  onClose: () => void;
  onAssign: (patientId: string, ambulanceId: string, hospitalId: string) => Promise<void>;
}

// Calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Estimate ETA based on distance (assuming average 30km/h in city)
function estimateETA(distanceKm: number): number {
  return Math.round((distanceKm / 30) * 60); // minutes
}

function getSeverityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-600 text-white";
    case "HIGH":
      return "bg-orange-500 text-white";
    case "MODERATE":
      return "bg-yellow-500 text-gray-900";
    default:
      return "bg-blue-500 text-white";
  }
}

function getSeverityBorder(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-red-400";
    case "HIGH":
      return "border-orange-400";
    case "MODERATE":
      return "border-yellow-400";
    default:
      return "border-blue-400";
  }
}

export function PatientAssignmentModal({
  patient,
  ambulances,
  isOpen,
  onClose,
  onAssign,
}: PatientAssignmentModalProps) {
  const [selectedAmbulance, setSelectedAmbulance] = useState<string | null>(null);
  const [selectedHospital, setSelectedHospital] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [step, setStep] = useState<"ambulance" | "hospital">("ambulance");

  // Get available ambulances sorted by distance
  const nearbyAmbulances = useMemo(() => {
    if (!patient) return [];
    
    return ambulances
      .filter((amb) => amb.state === "AVAILABLE" && amb.current_lat && amb.current_lng)
      .map((amb) => {
        const distance = calculateDistance(
          patient.lat,
          patient.lng,
          amb.current_lat!,
          amb.current_lng!
        );
        return {
          ...amb,
          distance,
          eta: estimateETA(distance),
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5); // Show top 5 nearest
  }, [patient, ambulances]);

  // Get hospitals sorted by distance from patient
  const nearbyHospitals: HospitalWithDistance[] = useMemo(() => {
    if (!patient) return [];
    
    return HOSPITALS.map((h: { id: string; name: string; lat: number; lng: number; beds: number; available: number }) => {
      const distance = calculateDistance(patient.lat, patient.lng, h.lat, h.lng);
      return {
        ...h,
        distance,
        eta: estimateETA(distance),
      };
    })
      .filter((h: HospitalWithDistance) => h.available > 0)
      .sort((a: HospitalWithDistance, b: HospitalWithDistance) => a.distance - b.distance);
  }, [patient]);

  const handleAssign = async () => {
    if (!patient || !selectedAmbulance || !selectedHospital) return;
    
    setIsAssigning(true);
    try {
      await onAssign(patient.id, selectedAmbulance, selectedHospital);
      setSelectedAmbulance(null);
      setSelectedHospital(null);
      setStep("ambulance");
      onClose();
    } catch (error) {
      console.error("Failed to assign ambulance:", error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedAmbulance(null);
    setSelectedHospital(null);
    setStep("ambulance");
    onClose();
  };

  const handleAmbulanceSelect = (id: string) => {
    setSelectedAmbulance(id);
    setStep("hospital");
  };

  const handleBack = () => {
    setStep("ambulance");
    setSelectedHospital(null);
  };

  if (!patient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="size-5 text-amber-500" />
            Emergency Case Assignment
          </DialogTitle>
          <DialogDescription>
            {step === "ambulance" 
              ? "Select an available ambulance to dispatch"
              : "Select destination hospital"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Patient Info Card */}
          <div className={`bg-gray-50 rounded-xl p-4 border-2 ${getSeverityBorder(patient.severity)}`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-full ${getSeverityColor(patient.severity)}`}>
                <User className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={getSeverityColor(patient.severity)}>
                    {patient.severity}
                  </Badge>
                  <span className="font-semibold text-gray-900">{patient.emergencyType}</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{patient.description || "Emergency case reported"}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 flex-wrap">
                  <MapPin className="size-3" />
                  <span>{patient.lat.toFixed(4)}, {patient.lng.toFixed(4)}</span>
                  <span className="mx-1">•</span>
                  <Clock className="size-3" />
                  <span>Reported: {new Date(patient.reportedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => step === "hospital" && handleBack()}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                step === "ambulance" 
                  ? "bg-teal-600 text-white shadow-md" 
                  : selectedAmbulance 
                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {selectedAmbulance ? (
                <Check className="size-4" />
              ) : (
                <span className="size-5 rounded-full border-2 border-current flex items-center justify-center text-xs">1</span>
              )}
              Ambulance
            </button>
            <div className="flex-1 h-0.5 bg-gray-200 rounded" />
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              step === "hospital" 
                ? "bg-teal-600 text-white shadow-md" 
                : "bg-gray-100 text-gray-400"
            }`}>
              <span className="size-5 rounded-full border-2 border-current flex items-center justify-center text-xs">2</span>
              Hospital
            </div>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[280px]">
            {step === "ambulance" ? (
              <>
                {nearbyAmbulances.length === 0 ? (
                  <div className="text-center py-8">
                    <AmbIcon className="size-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No available ambulances nearby</p>
                    <p className="text-xs text-gray-400 mt-1">All ambulances are currently on duty</p>
                  </div>
                ) : (
                  nearbyAmbulances.map((amb, idx) => (
                    <button
                      key={amb.id}
                      onClick={() => handleAmbulanceSelect(amb.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                        selectedAmbulance === amb.id
                          ? "border-teal-500 bg-teal-50 shadow-md"
                          : "border-gray-200 hover:border-teal-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="p-2.5 bg-green-100 rounded-xl">
                            <AmbIcon className="size-5 text-green-600" />
                          </div>
                          {idx === 0 && (
                            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-teal-600 text-white text-[9px] rounded-full font-bold shadow">
                              NEAREST
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">
                            {amb.vehicle_number || amb.id}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <Navigation className="size-3" />
                              {amb.distance.toFixed(1)} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              ETA: {amb.eta} min
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Available
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleBack}
                  className="text-sm text-teal-600 hover:text-teal-700 mb-2 flex items-center gap-1 font-medium"
                >
                  <ChevronLeft className="size-4" />
                  Back to ambulance selection
                </button>
                {nearbyHospitals.map((hospital, idx) => (
                  <button
                    key={hospital.id}
                    onClick={() => setSelectedHospital(hospital.id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      selectedHospital === hospital.id
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-gray-200 hover:border-teal-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="p-2.5 bg-red-100 rounded-xl">
                          <Building2 className="size-5 text-red-600" />
                        </div>
                        {idx === 0 && (
                          <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded-full font-bold shadow">
                            CLOSEST
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{hospital.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Navigation className="size-3" />
                            {hospital.distance.toFixed(1)} km
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            ~{hospital.eta} min
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-green-600">
                          {hospital.available}
                        </span>
                        <p className="text-[10px] text-gray-400">beds free</p>
                      </div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 pt-4 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          {step === "hospital" && (
            <Button
              onClick={handleAssign}
              disabled={!selectedAmbulance || !selectedHospital || isAssigning}
              className="flex-1 bg-teal-600 hover:bg-teal-700"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Dispatching...
                </>
              ) : (
                <>
                  <AmbIcon className="size-4 mr-2" />
                  Dispatch Ambulance
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
