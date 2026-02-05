"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  AlertCircle,
  Inbox,
  Eye,
  Building2,
} from "lucide-react";
import { emergencyApi } from "@/lib/api/emergency";
import type {
  EmergencyCase,
  HospitalLoad,
  EmergencySeverity,
  EmergencyStatus,
} from "@/lib/api/types";

/* ---------------------------------- */
/* SEVERITY / STATUS COLOR MAPPING     */
/* ---------------------------------- */

const severityColorMap: Record<EmergencySeverity, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  normal: "bg-green-100 text-green-700 border-green-300",
};

const statusColorMap: Record<EmergencyStatus, string> = {
  created: "bg-blue-100 text-blue-700",
  assigned: "bg-amber-100 text-amber-700",
  resolved: "bg-gray-100 text-gray-700",
};

/* ---------------------------------- */
/* CASE DETAIL MODAL                   */
/* ---------------------------------- */

interface CaseDetailModalProps {
  caseId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

function CaseDetailModal({ caseId, isOpen, onClose }: CaseDetailModalProps) {
  const [caseDetail, setCaseDetail] = useState<EmergencyCase | null>(null);
  const [suggestions, setSuggestions] = useState<HospitalLoad[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId || !isOpen) {
      setCaseDetail(null);
      setSuggestions(null);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        // First fetch the case details
        const detail = await emergencyApi.getEmergency(caseId);
        setCaseDetail(detail);
        
        // Then fetch suggestions using the case's severity
        try {
          const suggestionList = await emergencyApi.getHospitalSuggestions(detail.severity);
          setSuggestions(suggestionList);
        } catch {
          // Suggestions are optional, don't fail if not available
          setSuggestions(null);
        }
      } catch (err) {
        console.error("Failed to fetch case details:", err);
        setError("Failed to load case details");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [caseId, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emergency Case Details</DialogTitle>
          <DialogDescription>
            Case ID: {caseId}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 py-4">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {caseDetail && !loading && !error && (
          <div className="space-y-6">
            {/* Case Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground">Severity</p>
                <Badge className={severityColorMap[caseDetail.severity]}>
                  {caseDetail.severity.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Status</p>
                <Badge className={statusColorMap[caseDetail.status]}>
                  {caseDetail.status.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Hospital ID</p>
                <p className="font-medium">{caseDetail.hospital_id ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Bed Group ID</p>
                <p className="font-medium">{caseDetail.bed_group_id ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {new Date(caseDetail.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Assigned At</p>
                <p className="font-medium">
                  {caseDetail.assigned_at
                    ? new Date(caseDetail.assigned_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Resolved At</p>
                <p className="font-medium">
                  {caseDetail.resolved_at
                    ? new Date(caseDetail.resolved_at).toLocaleString()
                    : "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium">{caseDetail.notes ?? "—"}</p>
              </div>
            </div>

            {/* Hospital Suggestions (Read-Only) */}
            {suggestions && suggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hospital Load Suggestions (Read-Only)
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hospital</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>ICU</TableHead>
                        <TableHead>HDU</TableHead>
                        <TableHead>General</TableHead>
                        <TableHead>Occupancy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((hospital) => (
                        <TableRow key={hospital.hospital_id}>
                          <TableCell className="font-medium">
                            {hospital.hospital_name}
                          </TableCell>
                          <TableCell>{hospital.city}</TableCell>
                          <TableCell>
                            {hospital.icu_available}/{hospital.icu_total}
                          </TableCell>
                          <TableCell>
                            {hospital.hdu_available}/{hospital.hdu_total}
                          </TableCell>
                          <TableCell>
                            {hospital.general_available}/{hospital.general_total}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                hospital.overall_occupancy_rate > 90
                                  ? "border-red-300 text-red-700"
                                  : hospital.overall_occupancy_rate > 70
                                  ? "border-amber-300 text-amber-700"
                                  : "border-green-300 text-green-700"
                              }
                            >
                              {hospital.overall_occupancy_rate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  * Hospital suggestions are provided by the backend for reference only.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- */
/* FILTER CONTROLS                     */
/* ---------------------------------- */

interface FilterControlsProps {
  severity: EmergencySeverity | "";
  status: EmergencyStatus | "";
  onSeverityChange: (value: EmergencySeverity | "") => void;
  onStatusChange: (value: EmergencyStatus | "") => void;
}

function FilterControls({
  severity,
  status,
  onSeverityChange,
  onStatusChange,
}: FilterControlsProps) {
  return (
    <div className="flex gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Severity:</span>
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as EmergencySeverity | "")}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as EmergencyStatus | "")}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="created">Created</option>
          <option value="assigned">Assigned</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>
    </div>
  );
}

/* ---------------------------------- */
/* MAIN PAGE                           */
/* ---------------------------------- */

export default function EmergencyBoardPage() {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filters (passed to backend)
  const [severityFilter, setSeverityFilter] = useState<EmergencySeverity | "">("");
  const [statusFilter, setStatusFilter] = useState<EmergencyStatus | "">("");

  // Detail modal
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /* ---------------------------------- */
  /* DATA FETCH                          */
  /* ---------------------------------- */

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await emergencyApi.listEmergencies({
        severity: severityFilter || undefined,
        status: statusFilter || undefined,
      });
      setCases(response.items);
      setTotal(response.total);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch emergency cases:", err);
      setError("Failed to connect to backend. Please check if the server is running.");
      setCases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [severityFilter, statusFilter]);

  useEffect(() => {
    fetchCases();
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchCases, 15000);
    return () => clearInterval(interval);
  }, [fetchCases]);

  const openDetailModal = (caseId: number) => {
    setSelectedCaseId(caseId);
    setDetailModalOpen(true);
  };

  /* ---------------------------------- */
  /* RENDER                             */
  /* ---------------------------------- */

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Emergency Board</h2>
          <p className="text-sm text-muted-foreground">
            Monitor and manage emergency cases
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

      {/* FILTERS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <FilterControls
            severity={severityFilter}
            status={statusFilter}
            onSeverityChange={setSeverityFilter}
            onStatusChange={setStatusFilter}
          />
        </CardContent>
      </Card>

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
          <span className="text-muted-foreground">Loading emergency cases...</span>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && cases.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No Emergency Cases</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {severityFilter || statusFilter
                ? "No cases match the selected filters."
                : "There are currently no emergency cases in the system."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* CASES TABLE */}
      {cases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚨 Emergency Cases
            </CardTitle>
            <CardDescription>
              Showing {cases.length} of {total} cases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((emergencyCase) => (
                  <TableRow key={emergencyCase.id}>
                    <TableCell className="font-mono text-sm">
                      {emergencyCase.id}
                    </TableCell>
                    <TableCell>
                      <Badge className={severityColorMap[emergencyCase.severity]}>
                        {emergencyCase.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColorMap[emergencyCase.status]}>
                        {emergencyCase.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {emergencyCase.hospital_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(emergencyCase.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {emergencyCase.assigned_at
                        ? new Date(emergencyCase.assigned_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailModal(emergencyCase.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* DETAIL MODAL */}
      <CaseDetailModal
        caseId={selectedCaseId}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedCaseId(null);
        }}
      />
    </div>
  );
}
