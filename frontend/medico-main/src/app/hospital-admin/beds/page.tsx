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
  CheckCircle,
  AlertTriangle,
  Wrench,
  Search,
  Plus,
  Filter,
  RefreshCw,
  User,
  Clock,
  Edit,
  Trash2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mock bed data
const mockBeds = [
  { id: "B001", ward: "ICU", status: "occupied", patient: "Rajesh Kumar", admittedDate: "2024-01-15", condition: "critical" },
  { id: "B002", ward: "ICU", status: "available", patient: null, admittedDate: null, condition: null },
  { id: "B003", ward: "ICU", status: "maintenance", patient: null, admittedDate: null, condition: null },
  { id: "B004", ward: "ICU", status: "occupied", patient: "Priya Sharma", admittedDate: "2024-01-14", condition: "stable" },
  { id: "B005", ward: "General", status: "available", patient: null, admittedDate: null, condition: null },
  { id: "B006", ward: "General", status: "occupied", patient: "Amit Patel", admittedDate: "2024-01-16", condition: "stable" },
  { id: "B007", ward: "General", status: "occupied", patient: "Sunita Devi", admittedDate: "2024-01-13", condition: "improving" },
  { id: "B008", ward: "General", status: "available", patient: null, admittedDate: null, condition: null },
  { id: "B009", ward: "Emergency", status: "occupied", patient: "Vikram Singh", admittedDate: "2024-01-17", condition: "critical" },
  { id: "B010", ward: "Emergency", status: "available", patient: null, admittedDate: null, condition: null },
  { id: "B011", ward: "Emergency", status: "occupied", patient: "Meera Joshi", admittedDate: "2024-01-17", condition: "stable" },
  { id: "B012", ward: "Pediatric", status: "available", patient: null, admittedDate: null, condition: null },
  { id: "B013", ward: "Pediatric", status: "occupied", patient: "Aryan (Child)", admittedDate: "2024-01-16", condition: "improving" },
  { id: "B014", ward: "Pediatric", status: "available", patient: null, admittedDate: null, condition: null },
  { id: "B015", ward: "Maternity", status: "occupied", patient: "Anita Rao", admittedDate: "2024-01-15", condition: "stable" },
  { id: "B016", ward: "Maternity", status: "available", patient: null, admittedDate: null, condition: null },
];

const wards = ["All Wards", "ICU", "General", "Emergency", "Pediatric", "Maternity"];

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

const getConditionColor = (condition: string | null) => {
  switch (condition) {
    case "critical":
      return "destructive";
    case "stable":
      return "secondary";
    case "improving":
      return "default";
    default:
      return "outline";
  }
};

export default function BedManagementPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

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
    maintenance: mockBeds.filter((b) => b.status === "maintenance").length,
  };

  const handleAddBed = () => {
    toast.success("Bed added successfully");
    setAddDialogOpen(false);
  };

  return (
    <DashboardLayout
      role="hospital-admin"
      title="Bed Management"
      breadcrumbs={[
        { label: "Dashboard", href: "/hospital-admin" },
        { label: "Bed Management" },
      ]}
      userName="Hospital Admin"
      userRole="City General Hospital"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Beds"
            value={stats.total}
            icon={Bed}
            subtitle="Across all wards"
          />
          <StatsCard
            title="Available"
            value={stats.available}
            icon={CheckCircle}
            trend={{ value: 2, isPositive: true }}
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
            title="Maintenance"
            value={stats.maintenance}
            icon={Wrench}
            subtitle="Under repair"
            className="border-yellow-200 dark:border-yellow-900"
          />
        </DashboardGrid>

        {/* Filters and Actions */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
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
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Bed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Bed</DialogTitle>
                  <DialogDescription>Add a new bed to the hospital inventory</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="bed-id">Bed ID</Label>
                    <Input id="bed-id" placeholder="e.g., B017" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ward">Ward</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards.slice(1).map((ward) => (
                          <SelectItem key={ward} value={ward}>
                            {ward}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBed}>Add Bed</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </AnimatedCard>

        {/* Bed Grid */}
        <DashboardSection title="Bed Status" description={`Showing ${filteredBeds.length} beds`}>
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
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {bed.admittedDate}
                        </div>
                        {bed.condition && (
                          <Badge variant={getConditionColor(bed.condition)} className="text-xs">
                            {bed.condition}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3 pt-2 border-t">
                    <Button variant="ghost" size="sm" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {bed.status === "available" && (
                      <Button variant="ghost" size="sm" className="flex-1">
                        <Plus className="h-3 w-3 mr-1" />
                        Assign
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
}
