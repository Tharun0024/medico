"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  StatsCard,
  AnimatedCard,
} from "@/components/dashboard";
import {
  Ambulance,
  MapPin,
  Clock,
  Phone,
  Activity,
  AlertTriangle,
  CheckCircle,
  Navigation,
  Users,
  Fuel,
  Search,
  Filter,
  MoreHorizontal,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock ambulance data
const ambulances = [
  { id: "AMB-001", driver: "Rajesh Kumar", hospital: "City General Hospital", status: "available", location: "Connaught Place, Delhi", fuel: 85, lastService: "2024-01-15", phone: "+91 98765-43210" },
  { id: "AMB-002", driver: "Suresh Patel", hospital: "Metro Medical Center", status: "on-call", location: "Bandra, Mumbai", fuel: 60, lastService: "2024-01-10", phone: "+91 98765-43211", eta: "8 min" },
  { id: "AMB-003", driver: "Amit Singh", hospital: "Green Valley Hospital", status: "on-call", location: "Koramangala, Bangalore", fuel: 75, lastService: "2024-01-12", phone: "+91 98765-43212", eta: "12 min" },
  { id: "AMB-004", driver: "Vikram Sharma", hospital: "Sunrise Healthcare", status: "maintenance", location: "Service Center", fuel: 40, lastService: "2024-01-05", phone: "+91 98765-43213" },
  { id: "AMB-005", driver: "Deepak Verma", hospital: "Apollo Hospital", status: "available", location: "Jubilee Hills, Hyderabad", fuel: 90, lastService: "2024-01-18", phone: "+91 98765-43214" },
  { id: "AMB-006", driver: "Manoj Kumar", hospital: "Fortis Medical", status: "on-call", location: "Salt Lake, Kolkata", fuel: 55, lastService: "2024-01-08", phone: "+91 98765-43215", eta: "5 min" },
  { id: "AMB-007", driver: "Rahul Gupta", hospital: "Max Healthcare", status: "available", location: "Kothrud, Pune", fuel: 80, lastService: "2024-01-20", phone: "+91 98765-43216" },
  { id: "AMB-008", driver: "Sanjay Yadav", hospital: "Medanta Hospital", status: "off-duty", location: "Sector 38, Gurgaon", fuel: 70, lastService: "2024-01-14", phone: "+91 98765-43217" },
];

const emergencyCalls = [
  { id: 1, caller: "Emergency - Cardiac", location: "Sector 15, Noida", time: "2 min ago", status: "dispatched", ambulance: "AMB-002" },
  { id: 2, caller: "Accident - Road", location: "NH-48, Gurgaon", time: "5 min ago", status: "dispatched", ambulance: "AMB-003" },
  { id: 3, caller: "Emergency - Trauma", location: "Park Street, Kolkata", time: "8 min ago", status: "dispatched", ambulance: "AMB-006" },
  { id: 4, caller: "Medical Emergency", location: "MG Road, Bangalore", time: "15 min ago", status: "completed", ambulance: "AMB-001" },
];

export default function AmbulancesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const available = ambulances.filter((a) => a.status === "available").length;
  const onCall = ambulances.filter((a) => a.status === "on-call").length;
  const maintenance = ambulances.filter((a) => a.status === "maintenance").length;

  const filteredAmbulances = ambulances.filter((a) => {
    const matchesSearch = a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300";
      case "on-call": return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300";
      case "maintenance": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
      case "off-duty": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <DashboardLayout
      role="super-admin"
      title="Ambulance Fleet"
      breadcrumbs={[
        { label: "Dashboard", href: "/super-admin" },
        { label: "Ambulances" },
      ]}
      userName="Super Admin"
      userRole="Government Administrator"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Fleet"
            value={ambulances.length}
            subtitle="Registered ambulances"
            icon={Ambulance}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            title="Available"
            value={available}
            subtitle="Ready for dispatch"
            icon={CheckCircle}
            iconColor="bg-gradient-to-br from-green-500 to-green-600"
          />
          <StatsCard
            title="On Call"
            value={onCall}
            subtitle="Currently responding"
            icon={Activity}
            iconColor="bg-gradient-to-br from-red-500 to-red-600"
          />
          <StatsCard
            title="In Maintenance"
            value={maintenance}
            subtitle="Under service"
            icon={AlertTriangle}
            iconColor="bg-gradient-to-br from-yellow-500 to-yellow-600"
          />
        </DashboardGrid>

        {/* Active Emergency Calls */}
        <AnimatedCard delay={0.1}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Active Emergency Calls</h3>
              <p className="text-sm text-muted-foreground">Real-time emergency response tracking</p>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              {emergencyCalls.filter((c) => c.status === "dispatched").length} Active
            </Badge>
          </div>
          <div className="space-y-3">
            {emergencyCalls.map((call, index) => (
              <motion.div
                key={call.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  call.status === "dispatched" ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    call.status === "dispatched" ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"
                  }`}>
                    {call.status === "dispatched" ? (
                      <Activity className="h-5 w-5 text-red-600 dark:text-red-400 animate-pulse" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{call.caller}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {call.location}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{call.ambulance}</p>
                    <p className="text-xs text-muted-foreground">{call.time}</p>
                  </div>
                  <Badge variant={call.status === "dispatched" ? "destructive" : "default"}>
                    {call.status}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedCard>

        {/* Ambulance Fleet */}
        <DashboardSection
          title="Fleet Management"
          description="Monitor and manage ambulance fleet"
          action={
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search ambulances..."
                  className="pl-9 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="on-call">On Call</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="off-duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAmbulances.map((ambulance, index) => (
              <motion.div
                key={ambulance.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border bg-card p-5 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      ambulance.status === "on-call" ? "bg-red-100 dark:bg-red-950" :
                      ambulance.status === "available" ? "bg-green-100 dark:bg-green-950" :
                      "bg-gray-100 dark:bg-gray-800"
                    }`}>
                      <Ambulance className={`h-6 w-6 ${
                        ambulance.status === "on-call" ? "text-red-600 dark:text-red-400" :
                        ambulance.status === "available" ? "text-green-600 dark:text-green-400" :
                        "text-gray-600 dark:text-gray-400"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{ambulance.id}</h3>
                      <p className="text-sm text-muted-foreground">{ambulance.hospital}</p>
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
                        <Navigation className="mr-2 h-4 w-4" />
                        Track Location
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Phone className="mr-2 h-4 w-4" />
                        Contact Driver
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Activity className="mr-2 h-4 w-4" />
                        View History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Driver</span>
                    <span className="font-medium">{ambulance.driver}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge className={getStatusColor(ambulance.status)}>
                      {ambulance.status}
                    </Badge>
                  </div>
                  {ambulance.eta && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">ETA</span>
                      <span className="font-medium text-red-600">{ambulance.eta}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fuel Level</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ambulance.fuel > 70 ? "bg-green-500" :
                            ambulance.fuel > 40 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${ambulance.fuel}%` }}
                        />
                      </div>
                      <span className="text-sm">{ambulance.fuel}%</span>
                    </div>
                  </div>
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {ambulance.location}
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
