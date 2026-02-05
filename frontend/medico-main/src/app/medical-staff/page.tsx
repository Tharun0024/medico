"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  AnimatedCard,
  DataTable,
  StatusBadge,
  BedGrid,
  FeaturesGrid,
  FeatureDetailDialog,
  medicalStaffFeatures,
  MetricCard,
  ActivityItem,
  ScheduleItem,
  StatusOverview,
} from "@/components/dashboard";
import {
  Users,
  Bed,
  Trash2,
  Plus,
  Search,
  ArrowRight,
  Sparkles,
  Clock,
  AlertCircle,
  CheckCircle,
  UserPlus,
  RefreshCw,
  Calendar,
  Heart,
  Activity,
  Stethoscope,
  FileText,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/auth/auth-context";
import { useWebSocketContext } from "@/lib/hooks/use-websocket";
import {
  usePatients,
  useAdmitPatient,
  useAssignBed,
  useDischargePatient,
  useWardStatus,
} from "@/lib/hooks";
import type { Patient, PatientAdmitRequest, BedAssignRequest } from "@/lib/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const severityOptions = ["critical", "serious", "stable", "minor"];
const treatmentTypes = [
  "Surgery - Major",
  "Surgery - Minor",
  "Chemotherapy",
  "Dialysis",
  "ICU Care",
  "General Treatment",
  "Wound Care",
  "Diagnostic Procedure",
];

// Mock waste prediction by treatment (would come from backend in real app)
const wastePredictionByTreatment: Record<string, number> = {
  "Surgery - Major": 15,
  "Surgery - Minor": 5,
  "Chemotherapy": 8,
  "Dialysis": 12,
  "ICU Care": 10,
  "General Treatment": 2,
  "Wound Care": 3,
  "Diagnostic Procedure": 1,
};

// Mock schedule data for Medical Staff
const mySchedule = [
  { title: "Morning Rounds - ICU", time: "08:00 AM - 09:00 AM", status: "completed" as const, priority: "high" as const },
  { title: "Patient Consultation", time: "09:30 AM - 10:30 AM", status: "completed" as const, priority: "medium" as const },
  { title: "Surgery Assist - OR 2", time: "11:00 AM - 01:00 PM", status: "in-progress" as const, priority: "high" as const },
  { title: "Lab Results Review", time: "02:00 PM - 02:30 PM", status: "upcoming" as const, priority: "medium" as const },
  { title: "Evening Rounds", time: "05:00 PM - 06:00 PM", status: "upcoming" as const, priority: "high" as const },
];

// Mock recent activities
const recentActivities = [
  { title: "Patient Admitted", description: "Patient P-1045 admitted to your care", time: "10 min ago", icon: Users, type: "info" as const },
  { title: "Vitals Updated", description: "Patient P-1032 vitals recorded", time: "25 min ago", icon: Heart, type: "success" as const },
  { title: "Lab Results", description: "Blood work ready for Patient P-1028", time: "45 min ago", icon: FileText, type: "info" as const },
  { title: "Critical Alert", description: "Patient P-1019 requires immediate attention", time: "1 hour ago", icon: AlertCircle, type: "error" as const },
  { title: "Discharge Complete", description: "Patient P-1015 discharged successfully", time: "2 hours ago", icon: CheckCircle, type: "success" as const },
];

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}

export default function MedicalStaffDashboard() {
  // Auth check
  const { user, isLoading: authLoading } = useRequireAuth(["medical_staff"]);
  
  // WebSocket for real-time updates
  const { isConnected, subscribe } = useWebSocketContext();
  
  // API data hooks
  const { data: patientsData, isLoading: patientsLoading, refetch: refetchPatients } = usePatients();
  const { data: wardStatus, isLoading: wardLoading, refetch: refetchWard } = useWardStatus();
  
  // Extract patients array from PatientList response
  const patients: Patient[] = (patientsData as { items?: Patient[] } | undefined)?.items || [];
  
  // Mutations
  const admitPatient = useAdmitPatient();
  const assignBed = useAssignBed();
  const dischargePatient = useDischargePatient();
  
  // UI state
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [predictedWaste, setPredictedWaste] = useState<number | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<typeof medicalStaffFeatures[0] | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Form state for new patient
  const [newPatient, setNewPatient] = useState<PatientAdmitRequest>({
    notes: "",
    ward_type: undefined,
    treatment_type: undefined,
  });

  // Subscribe to real-time events
  useEffect(() => {
    const unsubPatient = subscribe("patient.admitted", () => {
      refetchPatients();
      refetchWard();
    });
    
    const unsubDischarge = subscribe("patient.discharged", () => {
      refetchPatients();
      refetchWard();
    });
    
    const unsubBed = subscribe("bed.updated", () => {
      refetchWard();
    });
    
    return () => {
      unsubPatient();
      unsubDischarge();
      unsubBed();
    };
  }, [subscribe, refetchPatients, refetchWard]);

  // Loading state
  if (authLoading || (patientsLoading && patients.length === 0)) {
    return (
      <DashboardLayout
        role="medical-staff"
        title="Medical Staff Portal"
        breadcrumbs={[{ label: "Medical Staff", href: "/medical-staff" }, { label: "Dashboard" }]}
        userName={user?.displayName || "Loading..."}
        userRole="Medical Staff"
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  // Calculate stats from updated_wards
  const wards = wardStatus?.updated_wards || [];
  const totalAvailableBeds = wards.reduce((sum, w) => sum + w.available, 0);
  const criticalPatients = patients.filter((p: Patient) => p.status === "in_treatment").length;

  // Create beds for grid from ward data (simplified view)
  const bedsForGrid = wards.flatMap((ward) => {
    const wardBeds = [];
    for (let i = 0; i < ward.available; i++) {
      wardBeds.push({
        id: `${ward.ward_type}-${i}`,
        number: `${ward.ward_type.toUpperCase()}-${i + 1}`,
        ward: ward.ward_type,
        status: "available" as const,
      });
    }
    return wardBeds;
  });

  const filteredPatients = patients.filter(
    (p: Patient) =>
      (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (p.notes?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const handleTreatmentChange = (treatment: string) => {
    setSelectedTreatment(treatment);
    const waste = wastePredictionByTreatment[treatment];
    setPredictedWaste(waste || null);
  };

  const handleAddPatient = async () => {
    try {
      await admitPatient.mutateAsync(newPatient);
      toast.success("Patient admitted successfully", {
        description: `Patient has been admitted`,
      });
      setIsAddingPatient(false);
      setNewPatient({
        notes: "",
        ward_type: undefined,
        treatment_type: undefined,
      });
      setSelectedTreatment("");
      setPredictedWaste(null);
    } catch (error) {
      toast.error("Failed to admit patient");
    }
  };

  const handleAssignBed = async (bed: typeof bedsForGrid[0]) => {
    if (selectedPatient) {
      try {
        // Get the ward's bed_group_id from the wards array
        const ward = wards.find(w => w.ward_type === bed.ward);
        if (!ward) {
          toast.error("Ward not found");
          return;
        }
        const request: BedAssignRequest = {
          bed_group_id: ward.bed_group_id,
        };
        await assignBed.mutateAsync({ patientId: selectedPatient.id, data: request });
        toast.success("Bed assigned", {
          description: `Patient ${selectedPatient.id} assigned to ${bed.number}`,
        });
        setSelectedPatient(null);
      } catch (error) {
        toast.error("Failed to assign bed");
      }
    }
  };

  const handleDischargePatient = async (patient: Patient) => {
    try {
      await dischargePatient.mutateAsync({ patientId: patient.id });
      toast.success("Patient discharged", {
        description: `Patient ${patient.id} has been discharged`,
      });
    } catch (error) {
      toast.error("Failed to discharge patient");
    }
  };

  const patientColumns = [
    {
      key: "id",
      header: "Patient",
      render: (patient: Patient) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-semibold text-primary">
            P{patient.id}
          </div>
          <div>
            <p className="font-medium">Patient #{patient.id}</p>
            <p className="text-xs text-muted-foreground">{patient.ward_type || 'Unassigned'}</p>
          </div>
        </div>
      ),
    },
    { 
      key: "treatment_type", 
      header: "Treatment",
      render: (patient: Patient) => patient.treatment_type || "-",
    },
    {
      key: "status",
      header: "Status",
      render: (patient: Patient) => <StatusBadge status={patient.status} />,
    },
    { 
      key: "notes", 
      header: "Notes",
      render: (patient: Patient) => patient.notes || "-",
    },
    {
      key: "actions",
      header: "Actions",
      render: (patient: Patient) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPatient(patient);
            }}
          >
            <Bed className="mr-1 h-3 w-3" />
            Assign Bed
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={dischargePatient.isPending}
            onClick={(e) => {
              e.stopPropagation();
              handleDischargePatient(patient);
            }}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Discharge
          </Button>
        </div>
      ),
    },
  ];

  const handleFeatureClick = (feature: typeof medicalStaffFeatures[0]) => {
    setSelectedFeature(feature);
    setFeatureDialogOpen(true);
  };

  return (
    <DashboardLayout
      role="medical-staff"
      title="Medical Staff Portal"
      breadcrumbs={[
        { label: "Medical Staff", href: "/medical-staff" },
        { label: "Dashboard" },
      ]}
      userName={user?.displayName || "Medical Staff"}
      userRole="Medical Staff"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            Connecting to real-time updates...
          </div>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">All Features</TabsTrigger>
            <TabsTrigger value="schedule">My Schedule</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/50 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{patients.length}</p>
                    <p className="text-xs text-muted-foreground">My Patients</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border/50 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
                    <Bed className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalAvailableBeds}</p>
                    <p className="text-xs text-muted-foreground">Beds Available</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border/50 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/50 dark:to-red-900/30 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{criticalPatients}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-border/50 bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/50 dark:to-violet-900/30 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{wards.length}</p>
                <p className="text-xs text-muted-foreground">Active Wards</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Dialog open={isAddingPatient} onOpenChange={setIsAddingPatient}>
            <DialogTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 transition-colors hover:border-primary hover:bg-primary/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                  <UserPlus className="h-6 w-6 text-primary-foreground" />
                </div>
                <span className="font-medium">Add Patient</span>
              </motion.button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Admit New Patient</DialogTitle>
                <DialogDescription>
                  Enter patient details to admit them to the hospital.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Ward Type</Label>
                  <Select
                    value={newPatient.ward_type || ""}
                    onValueChange={(v) => setNewPatient({ ...newPatient, ward_type: v as 'icu' | 'hdu' | 'general' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ward type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="icu">ICU</SelectItem>
                      <SelectItem value="hdu">HDU</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Treatment Type (for waste prediction)</Label>
                  <Select value={selectedTreatment} onValueChange={handleTreatmentChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select treatment" />
                    </SelectTrigger>
                    <SelectContent>
                      {treatmentTypes.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Enter any notes..."
                    value={newPatient.notes || ""}
                    onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                  />
                </div>

                {/* AI Waste Prediction */}
                {predictedWaste !== null && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-500">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">AI Waste Prediction</p>
                      <p className="text-xs text-muted-foreground">
                        Estimated medical waste for this treatment
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                        {predictedWaste} kg
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingPatient(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPatient} disabled={admitPatient.isPending}>
                  {admitPatient.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Patient
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => refetchPatients()}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
            <span className="font-medium">Refresh Data</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info("Opening waste report...")}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500">
              <Trash2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-medium">Report Waste</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => toast.info(`${totalAvailableBeds} beds available`)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card p-6 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500">
              <Bed className="h-6 w-6 text-white" />
            </div>
            <span className="font-medium">View Beds</span>
          </motion.button>
        </div>

        {/* Patient List */}
        <DashboardSection
          title="Patient List"
          description="Manage your assigned patients"
          action={
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          }
        >
          {patientsLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <DataTable
              data={filteredPatients}
              columns={patientColumns}
              emptyMessage="No patients found"
            />
          )}
        </DashboardSection>

        {/* Bed Assignment Dialog */}
        <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assign Bed</DialogTitle>
              <DialogDescription>
                Select an available bed for Patient #{selectedPatient?.id}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="mb-4 text-sm text-muted-foreground">
                {totalAvailableBeds} beds available
              </p>
              {wardLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <BedGrid
                  beds={bedsForGrid as any}
                  onBedClick={(bed: any) => handleAssignBed(bed)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Medical Waste Reporting */}
        <AnimatedCard delay={0.2}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-lg">AI-Powered Waste Prediction</h3>
              <p className="text-sm text-muted-foreground">
                Select a treatment type to see predicted waste output
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Treatment Type</Label>
              <Select value={selectedTreatment} onValueChange={handleTreatmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select treatment" />
                </SelectTrigger>
                <SelectContent>
                  {treatmentTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="flex flex-col items-center justify-center rounded-xl bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">Predicted Waste</p>
              <p className="text-3xl font-bold text-primary">
                {predictedWaste !== null ? `${predictedWaste} kg` : "---"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {treatmentTypes.map((treatment) => (
              <motion.button
                key={treatment}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTreatmentChange(treatment)}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 text-left transition-all",
                  selectedTreatment === treatment
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50"
                )}
              >
                <span className="text-sm font-medium">{treatment}</span>
                <span className="text-xs text-muted-foreground">
                  {wastePredictionByTreatment[treatment]} kg
                </span>
              </motion.button>
            ))}
          </div>
        </AnimatedCard>
          </TabsContent>

          {/* All Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <DashboardSection
              title="Medical Staff Features"
              description="All available features and tools for medical staff"
            >
              <FeaturesGrid features={medicalStaffFeatures} onFeatureClick={handleFeatureClick} />
            </DashboardSection>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0.1}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Today&apos;s Schedule</h3>
                    <p className="text-sm text-muted-foreground">Your activities for today</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Full Calendar
                  </Button>
                </div>
                <div className="space-y-3">
                  {mySchedule.map((item, index) => (
                    <ScheduleItem
                      key={index}
                      title={item.title}
                      time={item.time}
                      status={item.status}
                      priority={item.priority}
                    />
                  ))}
                </div>
              </AnimatedCard>

              <AnimatedCard delay={0.2}>
                <div className="mb-4">
                  <h3 className="font-semibold">Shift Overview</h3>
                  <p className="text-sm text-muted-foreground">Current shift details</p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Current Shift</span>
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full dark:bg-emerald-950 dark:text-emerald-300">Morning</span>
                    </div>
                    <p className="text-2xl font-bold">08:00 AM - 04:00 PM</p>
                    <p className="text-xs text-muted-foreground mt-1">6 hours remaining</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Patients Seen</p>
                      <p className="text-xl font-bold">12</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Procedures</p>
                      <p className="text-xl font-bold">4</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Discharges</p>
                      <p className="text-xl font-bold">3</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Pending Tasks</p>
                      <p className="text-xl font-bold">5</p>
                    </div>
                  </div>
                </div>
              </AnimatedCard>
            </div>

            {/* Weekly Schedule Overview */}
            <AnimatedCard delay={0.3}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">This Week</h3>
                  <p className="text-sm text-muted-foreground">Your shift schedule</p>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                  <div
                    key={day}
                    className={cn(
                      "rounded-lg border p-3 text-center",
                      index === 0 && "bg-primary/10 border-primary"
                    )}
                  >
                    <p className="text-xs font-medium text-muted-foreground">{day}</p>
                    <p className="text-sm font-bold mt-1">
                      {index < 5 ? (index % 2 === 0 ? "Morning" : "Evening") : "Off"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {index < 5 ? (index % 2 === 0 ? "8AM-4PM" : "4PM-12AM") : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </AnimatedCard>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <DashboardSection
              title="Recent Activity"
              description="Your recent actions and updates"
              action={
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              }
            >
              <div className="space-y-4">
                {[...recentActivities, ...recentActivities].map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-start gap-4 rounded-lg border border-border/50 p-4"
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      activity.type === "error" ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" :
                      activity.type === "warning" ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400" :
                      activity.type === "success" ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400" :
                      "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                    )}>
                      <activity.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.title}</p>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </DashboardSection>
          </TabsContent>
        </Tabs>

        {/* Feature Detail Dialog */}
        <FeatureDetailDialog
          feature={selectedFeature}
          open={featureDialogOpen}
          onOpenChange={setFeatureDialogOpen}
        />
      </div>
    </DashboardLayout>
  );
}
