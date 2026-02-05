"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  AnimatedCard,
  StatsCard,
  DashboardGrid,
} from "@/components/dashboard";
import {
  Bed,
  Search,
  CheckCircle,
  AlertTriangle,
  Wrench,
  User,
  ArrowRight,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mock bed data
const mockBeds = [
  { id: "B001", ward: "ICU", status: "occupied", patient: "Rajesh Kumar", patientId: "P001", admittedDate: "2024-01-15", condition: "critical" },
  { id: "B002", ward: "ICU", status: "available", patient: null, patientId: null, admittedDate: null, condition: null },
  { id: "B003", ward: "ICU", status: "maintenance", patient: null, patientId: null, admittedDate: null, condition: null },
  { id: "B004", ward: "ICU", status: "occupied", patient: "Priya Sharma", patientId: "P002", admittedDate: "2024-01-14", condition: "stable" },
  { id: "B005", ward: "General", status: "available", patient: null, patientId: null, admittedDate: null, condition: null },
  { id: "B006", ward: "General", status: "occupied", patient: "Amit Patel", patientId: "P003", admittedDate: "2024-01-16", condition: "stable" },
  { id: "B007", ward: "General", status: "occupied", patient: "Sunita Devi", patientId: "P004", admittedDate: "2024-01-13", condition: "improving" },
  { id: "B008", ward: "General", status: "available", patient: null, patientId: null, admittedDate: null, condition: null },
  { id: "B009", ward: "Emergency", status: "occupied", patient: "Vikram Singh", patientId: "P005", admittedDate: "2024-01-17", condition: "critical" },
  { id: "B010", ward: "Emergency", status: "available", patient: null, patientId: null, admittedDate: null, condition: null },
  { id: "B011", ward: "Emergency", status: "available", patient: null, patientId: null, admittedDate: null, condition: null },
  { id: "B012", ward: "Pediatric", status: "available", patient: null, patientId: null, admittedDate: null, condition: null },
];

// Mock unassigned patients
const unassignedPatients = [
  { id: "P010", name: "Rohit Verma", age: 35, gender: "Male", admissionType: "Emergency" },
  { id: "P011", name: "Kavita Jain", age: 42, gender: "Female", admissionType: "Planned" },
  { id: "P012", name: "Suresh Kumar", age: 58, gender: "Male", admissionType: "Emergency" },
];

const wards = ["All Wards", "ICU", "General", "Emergency", "Pediatric"];

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300";
    case "occupied":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
    case "maintenance":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function BedAssignmentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");

  const filteredBeds = mockBeds.filter((bed) => {
    const matchesSearch =
      bed.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bed.patient?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWard = selectedWard === "All Wards" || bed.ward === selectedWard;
    const matchesStatus = selectedStatus === "all" || bed.status === selectedStatus;
    return matchesSearch && matchesWard && matchesStatus;
  });

  const stats = {
    total: mockBeds.length,
    available: mockBeds.filter((b) => b.status === "available").length,
    occupied: mockBeds.filter((b) => b.status === "occupied").length,
    pendingAssignment: unassignedPatients.length,
  };

  const handleAssignBed = () => {
    if (selectedPatient && selectedBed) {
      toast.success(`Patient assigned to bed ${selectedBed}`);
      setAssignDialogOpen(false);
      setSelectedBed(null);
      setSelectedPatient("");
    }
  };

  const openAssignDialog = (bedId: string) => {
    setSelectedBed(bedId);
    setAssignDialogOpen(true);
  };

  return (
    <DashboardLayout
      role="medical-staff"
      title="Bed Assignment"
      breadcrumbs={[
        { label: "Dashboard", href: "/medical-staff" },
        { label: "Bed Assignment" },
      ]}
      userName="Dr. Priya Singh"
      userRole="Medical Staff"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Beds"
            value={stats.total}
            icon={Bed}
            subtitle="All wards"
          />
          <StatsCard
            title="Available"
            value={stats.available}
            icon={CheckCircle}
            subtitle="Ready for assignment"
            className="border-green-200 dark:border-green-900"
          />
          <StatsCard
            title="Occupied"
            value={stats.occupied}
            icon={User}
            subtitle={`${((stats.occupied / stats.total) * 100).toFixed(0)}% occupancy`}
            className="border-red-200 dark:border-red-900"
          />
          <StatsCard
            title="Pending Assignment"
            value={stats.pendingAssignment}
            icon={AlertTriangle}
            subtitle="Patients waiting"
            className="border-yellow-200 dark:border-yellow-900"
          />
        </DashboardGrid>

        {/* Pending Assignments */}
        {unassignedPatients.length > 0 && (
          <AnimatedCard className="border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <h3 className="font-semibold">Patients Awaiting Bed Assignment</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unassignedPatients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between rounded-lg border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.age}y, {patient.gender} • {patient.admissionType}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Assign
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        )}

        {/* Filters */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search beds or patients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedWard} onValueChange={setSelectedWard}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select ward" />
              </SelectTrigger>
              <SelectContent>
                {wards.map((ward) => (
                  <SelectItem key={ward} value={ward}>
                    {ward}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="occupied">Occupied</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AnimatedCard>

        {/* Bed Grid */}
        <DashboardSection title="Bed Overview" description={`${filteredBeds.length} beds displayed`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredBeds.map((bed, index) => (
              <motion.div
                key={bed.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className={cn(
                    "rounded-lg border p-4 transition-all hover:shadow-md",
                    bed.status === "available" && "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20",
                    bed.status === "occupied" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20",
                    bed.status === "maintenance" && "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{bed.id}</span>
                    </div>
                    <Badge className={getStatusColor(bed.status)}>{bed.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{bed.ward} Ward</p>
                  
                  {bed.patient && (
                    <div className="space-y-1 pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{bed.patient}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Since {bed.admittedDate}
                      </div>
                    </div>
                  )}

                  {bed.status === "available" && (
                    <Button
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => openAssignDialog(bed.id)}
                    >
                      Assign Patient
                    </Button>
                  )}
                  
                  {bed.status === "occupied" && (
                    <Button variant="outline" size="sm" className="w-full mt-3">
                      Transfer Patient
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardSection>

        {/* Assign Dialog */}
        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Patient to Bed {selectedBed}</DialogTitle>
              <DialogDescription>Select a patient to assign to this bed</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="patient">Select Patient</Label>
                <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedPatients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.name} ({patient.age}y, {patient.gender})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignBed} disabled={!selectedPatient}>
                Assign Bed
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
