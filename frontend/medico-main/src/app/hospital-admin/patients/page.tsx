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
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  FileText,
  Activity,
  Calendar,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

// Mock patient data
const mockPatients = [
  {
    id: "P001",
    name: "Rajesh Kumar",
    age: 45,
    gender: "Male",
    phone: "+91 98765-43210",
    bed: "B001",
    ward: "ICU",
    status: "critical",
    admittedDate: "2024-01-15",
    doctor: "Dr. Sharma",
    diagnosis: "Cardiac Arrest",
  },
  {
    id: "P002",
    name: "Priya Sharma",
    age: 32,
    gender: "Female",
    phone: "+91 98765-43211",
    bed: "B004",
    ward: "ICU",
    status: "stable",
    admittedDate: "2024-01-14",
    doctor: "Dr. Patel",
    diagnosis: "Pneumonia",
  },
  {
    id: "P003",
    name: "Amit Patel",
    age: 28,
    gender: "Male",
    phone: "+91 98765-43212",
    bed: "B006",
    ward: "General",
    status: "improving",
    admittedDate: "2024-01-16",
    doctor: "Dr. Singh",
    diagnosis: "Appendicitis",
  },
  {
    id: "P004",
    name: "Sunita Devi",
    age: 55,
    gender: "Female",
    phone: "+91 98765-43213",
    bed: "B007",
    ward: "General",
    status: "stable",
    admittedDate: "2024-01-13",
    doctor: "Dr. Gupta",
    diagnosis: "Diabetes Management",
  },
  {
    id: "P005",
    name: "Vikram Singh",
    age: 38,
    gender: "Male",
    phone: "+91 98765-43214",
    bed: "B009",
    ward: "Emergency",
    status: "critical",
    admittedDate: "2024-01-17",
    doctor: "Dr. Sharma",
    diagnosis: "Accident Trauma",
  },
  {
    id: "P006",
    name: "Meera Joshi",
    age: 42,
    gender: "Female",
    phone: "+91 98765-43215",
    bed: "B011",
    ward: "Emergency",
    status: "stable",
    admittedDate: "2024-01-17",
    doctor: "Dr. Verma",
    diagnosis: "Food Poisoning",
  },
  {
    id: "P007",
    name: "Aryan Kumar",
    age: 8,
    gender: "Male",
    phone: "+91 98765-43216",
    bed: "B013",
    ward: "Pediatric",
    status: "improving",
    admittedDate: "2024-01-16",
    doctor: "Dr. Mehta",
    diagnosis: "Viral Fever",
  },
  {
    id: "P008",
    name: "Anita Rao",
    age: 29,
    gender: "Female",
    phone: "+91 98765-43217",
    bed: "B015",
    ward: "Maternity",
    status: "stable",
    admittedDate: "2024-01-15",
    doctor: "Dr. Reddy",
    diagnosis: "Normal Delivery",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "critical":
      return "destructive";
    case "stable":
      return "secondary";
    case "improving":
      return "default";
    case "discharged":
      return "outline";
    default:
      return "secondary";
  }
};

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<typeof mockPatients[0] | null>(null);

  const filteredPatients = mockPatients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesWard = selectedWard === "all" || patient.ward === selectedWard;
    const matchesStatus = selectedStatus === "all" || patient.status === selectedStatus;
    return matchesSearch && matchesWard && matchesStatus;
  });

  const stats = {
    total: mockPatients.length,
    critical: mockPatients.filter((p) => p.status === "critical").length,
    stable: mockPatients.filter((p) => p.status === "stable").length,
    improving: mockPatients.filter((p) => p.status === "improving").length,
  };

  return (
    <DashboardLayout
      role="hospital-admin"
      title="Patients"
      breadcrumbs={[
        { label: "Dashboard", href: "/hospital-admin" },
        { label: "Patients" },
      ]}
      userName="Hospital Admin"
      userRole="City General Hospital"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Patients"
            value={stats.total}
            icon={Users}
            subtitle="Currently admitted"
          />
          <StatsCard
            title="Critical"
            value={stats.critical}
            icon={Activity}
            subtitle="Require immediate attention"
            className="border-red-200 dark:border-red-900"
          />
          <StatsCard
            title="Stable"
            value={stats.stable}
            icon={Activity}
            subtitle="Condition stable"
            className="border-green-200 dark:border-green-900"
          />
          <StatsCard
            title="Improving"
            value={stats.improving}
            icon={Activity}
            subtitle="Showing improvement"
            className="border-blue-200 dark:border-blue-900"
          />
        </DashboardGrid>

        {/* Filters and Actions */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedWard} onValueChange={setSelectedWard}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Ward" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  <SelectItem value="ICU">ICU</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                  <SelectItem value="Pediatric">Pediatric</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="improving">Improving</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            </div>
          </div>
        </AnimatedCard>

        {/* Patients Table */}
        <AnimatedCard delay={0.1}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>Bed/Ward</TableHead>
                <TableHead>Doctor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Admitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient, index) => (
                <motion.tr
                  key={patient.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>{patient.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.age}y, {patient.gender}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{patient.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{patient.bed}</p>
                      <p className="text-sm text-muted-foreground">{patient.ward}</p>
                    </div>
                  </TableCell>
                  <TableCell>{patient.doctor}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(patient.status)}>{patient.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {patient.admittedDate}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPatient(patient)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Patient Details</DialogTitle>
                            <DialogDescription>Complete patient information</DialogDescription>
                          </DialogHeader>
                          {selectedPatient && (
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                  <AvatarFallback className="text-xl">
                                    {selectedPatient.name.split(" ").map((n) => n[0]).join("")}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold text-lg">{selectedPatient.name}</h3>
                                  <p className="text-muted-foreground">
                                    {selectedPatient.age} years, {selectedPatient.gender}
                                  </p>
                                </div>
                              </div>
                              <div className="grid gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  {selectedPatient.phone}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  {selectedPatient.bed}, {selectedPatient.ward} Ward
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  Admitted: {selectedPatient.admittedDate}
                                </div>
                              </div>
                              <div className="rounded-lg bg-muted p-3">
                                <p className="text-sm font-medium">Diagnosis</p>
                                <p className="text-muted-foreground">{selectedPatient.diagnosis}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Status</span>
                                <Badge variant={getStatusColor(selectedPatient.status)}>
                                  {selectedPatient.status}
                                </Badge>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
