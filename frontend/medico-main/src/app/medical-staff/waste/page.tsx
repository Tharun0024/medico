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
  Trash2,
  Biohazard,
  AlertTriangle,
  Package,
  Recycle,
  Plus,
  Search,
  Send,
  Clock,
  CheckCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Mock waste reports
const recentReports = [
  {
    id: "WR001",
    type: "Infectious",
    weight: "5.2 kg",
    location: "ICU Ward",
    reportedBy: "Dr. Priya Singh",
    date: "2024-01-17 14:30",
    status: "submitted",
    description: "Blood-soaked materials and used syringes",
  },
  {
    id: "WR002",
    type: "Hazardous",
    weight: "1.8 kg",
    location: "Laboratory",
    reportedBy: "Dr. Priya Singh",
    date: "2024-01-17 11:15",
    status: "collected",
    description: "Chemical waste from lab tests",
  },
  {
    id: "WR003",
    type: "General",
    weight: "12.5 kg",
    location: "General Ward",
    reportedBy: "Nurse Meera",
    date: "2024-01-17 09:00",
    status: "collected",
    description: "Non-hazardous medical waste",
  },
  {
    id: "WR004",
    type: "Recyclable",
    weight: "3.2 kg",
    location: "OPD",
    reportedBy: "Dr. Priya Singh",
    date: "2024-01-16 16:45",
    status: "collected",
    description: "Plastic containers and packaging",
  },
  {
    id: "WR005",
    type: "Infectious",
    weight: "4.8 kg",
    location: "Emergency",
    reportedBy: "Dr. Singh",
    date: "2024-01-16 14:00",
    status: "pending",
    description: "Wound dressing and surgical waste",
  },
];

const wasteTypes = [
  { value: "infectious", label: "Infectious Waste", icon: Biohazard, color: "text-red-500" },
  { value: "hazardous", label: "Hazardous Waste", icon: AlertTriangle, color: "text-orange-500" },
  { value: "general", label: "General Waste", icon: Package, color: "text-blue-500" },
  { value: "recyclable", label: "Recyclable Waste", icon: Recycle, color: "text-green-500" },
];

const locations = [
  "ICU Ward",
  "General Ward",
  "Emergency",
  "OPD",
  "Laboratory",
  "Surgery",
  "Pediatric",
  "Maternity",
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "collected":
      return "default";
    case "submitted":
      return "secondary";
    case "pending":
      return "outline";
    default:
      return "secondary";
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case "Infectious":
      return <Biohazard className="h-4 w-4 text-red-500" />;
    case "Hazardous":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "General":
      return <Package className="h-4 w-4 text-blue-500" />;
    case "Recyclable":
      return <Recycle className="h-4 w-4 text-green-500" />;
    default:
      return <Trash2 className="h-4 w-4" />;
  }
};

export default function WasteReportPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [formData, setFormData] = useState({
    type: "",
    weight: "",
    location: "",
    description: "",
  });

  const filteredReports = recentReports.filter((report) => {
    const matchesSearch =
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || report.type.toLowerCase() === selectedType;
    return matchesSearch && matchesType;
  });

  const stats = {
    totalReports: recentReports.length,
    pending: recentReports.filter((r) => r.status === "pending").length,
    submitted: recentReports.filter((r) => r.status === "submitted").length,
    collected: recentReports.filter((r) => r.status === "collected").length,
  };

  const handleSubmit = () => {
    if (formData.type && formData.weight && formData.location) {
      toast.success("Waste report submitted successfully");
      setDialogOpen(false);
      setFormData({ type: "", weight: "", location: "", description: "" });
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  return (
    <DashboardLayout
      role="medical-staff"
      title="Waste Report"
      breadcrumbs={[
        { label: "Dashboard", href: "/medical-staff" },
        { label: "Waste Report" },
      ]}
      userName="Dr. Priya Singh"
      userRole="Medical Staff"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Reports"
            value={stats.totalReports}
            icon={FileText}
            subtitle="This week"
          />
          <StatsCard
            title="Pending Collection"
            value={stats.pending}
            icon={Clock}
            subtitle="Awaiting pickup"
            className="border-yellow-200 dark:border-yellow-900"
          />
          <StatsCard
            title="Submitted"
            value={stats.submitted}
            icon={Send}
            subtitle="Ready for collection"
            className="border-blue-200 dark:border-blue-900"
          />
          <StatsCard
            title="Collected"
            value={stats.collected}
            icon={CheckCircle}
            subtitle="Successfully processed"
            className="border-green-200 dark:border-green-900"
          />
        </DashboardGrid>

        {/* Quick Report Cards */}
        <DashboardSection title="Quick Report" description="Select waste type to create a new report">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {wasteTypes.map((type, index) => (
              <motion.div
                key={type.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setFormData({ ...formData, type: type.value });
                    setDialogOpen(true);
                  }}
                >
                  <type.icon className={`h-8 w-8 ${type.color}`} />
                  <span className="font-medium">{type.label}</span>
                </Button>
              </motion.div>
            ))}
          </div>
        </DashboardSection>

        {/* Filters and Actions */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reports..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Waste type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="infectious">Infectious</SelectItem>
                  <SelectItem value="hazardous">Hazardous</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="recyclable">Recyclable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Waste Report</DialogTitle>
                  <DialogDescription>Report medical waste for collection</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Waste Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData({ ...formData, type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select waste type" />
                      </SelectTrigger>
                      <SelectContent>
                        {wasteTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className={`h-4 w-4 ${type.color}`} />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="weight">Estimated Weight (kg) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="e.g., 5.2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Location *</Label>
                    <Select
                      value={formData.location}
                      onValueChange={(v) => setFormData({ ...formData, location: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the waste..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </AnimatedCard>

        {/* Reports Table */}
        <AnimatedCard delay={0.1}>
          <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report, index) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TableCell className="font-mono text-sm">{report.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(report.type)}
                      <span>{report.type}</span>
                    </div>
                  </TableCell>
                  <TableCell>{report.weight}</TableCell>
                  <TableCell>{report.location}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{report.date}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(report.status)}>{report.status}</Badge>
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
