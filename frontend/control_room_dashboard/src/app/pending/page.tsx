"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, AlertCircle, Inbox, CheckCircle } from "lucide-react";
import { dashboardAPI } from "@/lib/api";

/* ---------------------------------- */
/* API CONFIGURATION                   */
/* ---------------------------------- */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ---------------------------------- */
/* TYPES                               */
/* ---------------------------------- */

interface PendingCase {
  id?: string;
  emergency_id?: string;
  severity?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  reported_time?: string;
  created_at?: string;
  current_status?: string;
  status?: string;
  emergency_type?: string;
  description?: string;
}

interface AssignmentPayload {
  hospital_id: number;
  ambulance_id?: string;
  notes?: string;
}

interface AssignmentResponse {
  id?: number;
  emergency_id?: number;
  hospital_id?: number;
  status?: string;
  message?: string;
}

/* ---------------------------------- */
/* SEVERITY COLOR MAPPING              */
/* ---------------------------------- */

const severityColorMap: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-300",
  critical: "bg-red-100 text-red-700 border-red-300",
  HIGH: "bg-orange-100 text-orange-700 border-orange-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  MODERATE: "bg-yellow-100 text-yellow-700 border-yellow-300",
  moderate: "bg-yellow-100 text-yellow-700 border-yellow-300",
  NORMAL: "bg-green-100 text-green-700 border-green-300",
  normal: "bg-green-100 text-green-700 border-green-300",
  LOW: "bg-blue-100 text-blue-700 border-blue-300",
  low: "bg-blue-100 text-blue-700 border-blue-300",
};

/* ---------------------------------- */
/* ASSIGN MODAL                        */
/* ---------------------------------- */

interface AssignModalProps {
  pendingCase: PendingCase | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (caseId: string, payload: AssignmentPayload) => Promise<void>;
  isAssigning: boolean;
}

function AssignModal({
  pendingCase,
  isOpen,
  onClose,
  onAssign,
  isAssigning,
}: AssignModalProps) {
  const [hospitalId, setHospitalId] = useState("");
  const [ambulanceId, setAmbulanceId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async () => {
    if (!pendingCase || !hospitalId) return;
    const caseId = pendingCase.id || pendingCase.emergency_id || "";
    await onAssign(caseId, {
      hospital_id: parseInt(hospitalId, 10),
      ambulance_id: ambulanceId || undefined,
      notes: notes || undefined,
    });
    // Reset form
    setHospitalId("");
    setAmbulanceId("");
    setNotes("");
  };

  if (!pendingCase) return null;

  const caseId = pendingCase.id || pendingCase.emergency_id || "Unknown";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Emergency Case</DialogTitle>
          <DialogDescription>
            Case ID: {caseId}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="hospital_id">Hospital ID (required)</Label>
            <Input
              id="hospital_id"
              type="number"
              placeholder="Enter hospital ID"
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ambulance_id">Ambulance ID (optional)</Label>
            <Input
              id="ambulance_id"
              placeholder="Enter ambulance ID"
              value={ambulanceId}
              onChange={(e) => setAmbulanceId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="Additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!hospitalId || isAssigning}
          >
            {isAssigning ? (
              <>
                <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                Assigning...
              </>
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- */
/* MAIN PAGE                           */
/* ---------------------------------- */

export default function PendingCasesPage() {
  const [cases, setCases] = useState<PendingCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Assignment state
  const [selectedCase, setSelectedCase] = useState<PendingCase | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  /* ---------------------------------- */
  /* DATA FETCH                          */
  /* ---------------------------------- */

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pendingCases = await dashboardAPI.getPendingCases();
      if (Array.isArray(pendingCases)) {
        setCases(pendingCases as PendingCase[]);
      } else {
        setCases([]);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch pending cases:", err);
      setError("Failed to connect to backend. Please check if the server is running.");
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchCases, 15000);
    return () => clearInterval(interval);
  }, [fetchCases]);

  /* ---------------------------------- */
  /* ASSIGNMENT HANDLER                  */
  /* ---------------------------------- */

  const handleAssign = async (caseId: string, payload: AssignmentPayload) => {
    setIsAssigning(true);
    setAssignmentResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/control/assign/${caseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Assignment failed: ${response.status}`);
      }

      const result: AssignmentResponse = await response.json();

      setAssignmentResult({
        success: true,
        message: result.message || `Case ${caseId} assigned successfully to hospital ${payload.hospital_id}`,
      });

      // Close modal and refresh list
      setAssignModalOpen(false);
      setSelectedCase(null);
      await fetchCases();
    } catch (err) {
      console.error("Assignment failed:", err);
      setAssignmentResult({
        success: false,
        message: err instanceof Error ? err.message : "Assignment failed",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const openAssignModal = (pendingCase: PendingCase) => {
    setSelectedCase(pendingCase);
    setAssignModalOpen(true);
    setAssignmentResult(null);
  };

  /* ---------------------------------- */
  /* RENDER                             */
  /* ---------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Pending Cases</h2>
          <p className="text-sm text-muted-foreground">
            Unassigned emergency cases awaiting dispatch
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCases}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ASSIGNMENT RESULT BANNER */}
      {assignmentResult && (
        <div
          className={`rounded-lg p-4 flex items-center gap-3 ${
            assignmentResult.success
              ? "bg-green-50 border border-green-300 text-green-800"
              : "bg-red-50 border border-red-300 text-red-800"
          }`}
        >
          {assignmentResult.success ? (
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {assignmentResult.success ? "Assignment Successful" : "Assignment Failed"}
            </p>
            <p className="text-sm">{assignmentResult.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setAssignmentResult(null)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Connection Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && cases.length === 0 && !error && (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground mr-3" />
          <span className="text-muted-foreground">Loading pending cases...</span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && cases.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Pending Cases</h3>
            <p className="text-sm text-muted-foreground mt-1">
              All emergency cases have been assigned.
            </p>
          </CardContent>
        </Card>
      )}

      {/* CASES TABLE */}
      {cases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚠️ Pending Cases ({cases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Emergency ID</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reported Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((pendingCase, index) => {
                  const caseId = pendingCase.id || pendingCase.emergency_id || `case-${index}`;
                  const severity = pendingCase.severity || "UNKNOWN";
                  const location =
                    pendingCase.location_address ||
                    (pendingCase.location_lat && pendingCase.location_lng
                      ? `${pendingCase.location_lat.toFixed(4)}, ${pendingCase.location_lng.toFixed(4)}`
                      : "—");
                  const reportedTime =
                    pendingCase.reported_time ||
                    pendingCase.created_at ||
                    "—";
                  const status =
                    pendingCase.current_status || pendingCase.status || "PENDING";

                  return (
                    <TableRow key={caseId}>
                      <TableCell className="font-mono text-sm">{caseId}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            severityColorMap[severity] ||
                            "bg-gray-100 text-gray-700"
                          }
                        >
                          {severity.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={location}>
                        {location}
                      </TableCell>
                      <TableCell className="text-sm">
                        {reportedTime !== "—"
                          ? new Date(reportedTime).toLocaleString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openAssignModal(pendingCase)}
                        >
                          Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ASSIGN MODAL */}
      <AssignModal
        pendingCase={selectedCase}
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedCase(null);
        }}
        onAssign={handleAssign}
        isAssigning={isAssigning}
      />
    </div>
  );
}
