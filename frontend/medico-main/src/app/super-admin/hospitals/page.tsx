"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  StatsCard,
  AnimatedCard,
  DataTable,
  StatusBadge,
} from "@/components/dashboard";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Bed,
  Users,
  Activity,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Mock hospital data
const hospitals = [
  { id: 1, name: "City General Hospital", city: "Delhi", beds: 500, available: 120, occupancy: 76, status: "active", contact: "+91 11-2345-6789", email: "contact@citygeneral.com" },
  { id: 2, name: "Metro Medical Center", city: "Mumbai", beds: 350, available: 45, occupancy: 87, status: "active", contact: "+91 22-3456-7890", email: "info@metromedical.com" },
  { id: 3, name: "Green Valley Hospital", city: "Bangalore", beds: 280, available: 90, occupancy: 68, status: "active", contact: "+91 80-4567-8901", email: "admin@greenvalley.com" },
  { id: 4, name: "Sunrise Healthcare", city: "Chennai", beds: 420, available: 25, occupancy: 94, status: "critical", contact: "+91 44-5678-9012", email: "help@sunrise.com" },
  { id: 5, name: "Apollo Hospital", city: "Hyderabad", beds: 600, available: 180, occupancy: 70, status: "active", contact: "+91 40-6789-0123", email: "support@apollo.com" },
  { id: 6, name: "Fortis Medical", city: "Kolkata", beds: 320, available: 80, occupancy: 75, status: "active", contact: "+91 33-7890-1234", email: "info@fortis.com" },
  { id: 7, name: "Max Healthcare", city: "Pune", beds: 250, available: 10, occupancy: 96, status: "critical", contact: "+91 20-8901-2345", email: "care@max.com" },
  { id: 8, name: "Medanta Hospital", city: "Gurgaon", beds: 450, available: 150, occupancy: 67, status: "active", contact: "+91 124-9012-3456", email: "contact@medanta.com" },
];

export default function HospitalsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBeds = hospitals.reduce((sum, h) => sum + h.beds, 0);
  const totalAvailable = hospitals.reduce((sum, h) => sum + h.available, 0);
  const criticalCount = hospitals.filter((h) => h.status === "critical").length;

  return (
    <DashboardLayout
      role="super-admin"
      title="Hospital Management"
      breadcrumbs={[
        { label: "Dashboard", href: "/super-admin" },
        { label: "Hospitals" },
      ]}
      userName="Super Admin"
      userRole="Government Administrator"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Hospitals"
            value={hospitals.length}
            subtitle="Registered facilities"
            icon={Building2}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            title="Total Beds"
            value={totalBeds.toLocaleString()}
            subtitle="Across all hospitals"
            icon={Bed}
            iconColor="bg-gradient-to-br from-cyan-500 to-cyan-600"
          />
          <StatsCard
            title="Available Beds"
            value={totalAvailable.toLocaleString()}
            subtitle={`${((totalAvailable / totalBeds) * 100).toFixed(1)}% availability`}
            icon={Activity}
            iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatsCard
            title="Critical Status"
            value={criticalCount}
            subtitle="Hospitals above 90% capacity"
            icon={Building2}
            iconColor="bg-gradient-to-br from-red-500 to-red-600"
          />
        </DashboardGrid>

        {/* Hospital List */}
        <DashboardSection
          title="All Hospitals"
          description="Manage registered hospitals in the network"
          action={
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search hospitals..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Hospital
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Hospital</DialogTitle>
                    <DialogDescription>Register a new hospital in the network</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Hospital Name</Label>
                      <Input placeholder="Enter hospital name" />
                    </div>
                    <div className="grid gap-2">
                      <Label>City</Label>
                      <Input placeholder="Enter city" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label>ICU Beds</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                      <div className="grid gap-2">
                        <Label>HDU Beds</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                      <div className="grid gap-2">
                        <Label>General Beds</Label>
                        <Input type="number" placeholder="0" />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label>Contact Number</Label>
                      <Input placeholder="+91 XX-XXXX-XXXX" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="contact@hospital.com" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={() => setIsAddDialogOpen(false)}>Add Hospital</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHospitals.map((hospital, index) => (
              <motion.div
                key={hospital.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border bg-card p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{hospital.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {hospital.city}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Bed Capacity</span>
                    <span className="font-semibold">{hospital.beds}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Available</span>
                    <span className="font-semibold text-green-600">{hospital.available}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Occupancy</span>
                    <Badge variant={hospital.occupancy > 90 ? "destructive" : hospital.occupancy > 70 ? "secondary" : "default"}>
                      {hospital.occupancy}%
                    </Badge>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <Phone className="h-3 w-3" />
                      {hospital.contact}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {hospital.email}
                    </div>
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
