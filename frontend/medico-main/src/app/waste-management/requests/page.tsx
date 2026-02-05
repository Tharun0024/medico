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
  ClipboardList,
  Search,
  Filter,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Truck,
  Biohazard,
  Package,
  Recycle,
  Phone,
  Navigation,
  Eye,
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mock pickup requests
const mockRequests = [
  {
    id: "PR001",
    hospital: "City General Hospital",
    address: "123 Medical Street, Mumbai",
    wasteType: "Infectious",
    weight: "45 kg",
    priority: "high",
    requestedDate: "2024-01-17",
    requestedTime: "09:00 AM",
    status: "pending",
    contact: "+91 22-2345-6789",
    notes: "Multiple containers, use biohazard protocol",
  },
  {
    id: "PR002",
    hospital: "Apollo Hospital",
    address: "456 Health Avenue, Mumbai",
    wasteType: "Hazardous",
    weight: "12 kg",
    priority: "high",
    requestedDate: "2024-01-17",
    requestedTime: "10:30 AM",
    status: "assigned",
    contact: "+91 22-3456-7890",
    notes: "Chemical waste from laboratory",
  },
  {
    id: "PR003",
    hospital: "Fortis Hospital",
    address: "789 Care Road, Mumbai",
    wasteType: "General",
    weight: "78 kg",
    priority: "normal",
    requestedDate: "2024-01-17",
    requestedTime: "11:00 AM",
    status: "in-progress",
    contact: "+91 22-4567-8901",
    notes: "Regular medical waste pickup",
  },
  {
    id: "PR004",
    hospital: "Lilavati Hospital",
    address: "321 Wellness Lane, Mumbai",
    wasteType: "Recyclable",
    weight: "23 kg",
    priority: "low",
    requestedDate: "2024-01-17",
    requestedTime: "02:00 PM",
    status: "pending",
    contact: "+91 22-5678-9012",
    notes: "Plastic containers and packaging",
  },
  {
    id: "PR005",
    hospital: "Hinduja Hospital",
    address: "654 Treatment Blvd, Mumbai",
    wasteType: "Infectious",
    weight: "32 kg",
    priority: "high",
    requestedDate: "2024-01-17",
    requestedTime: "03:30 PM",
    status: "pending",
    contact: "+91 22-6789-0123",
    notes: "Surgical waste from operation theater",
  },
  {
    id: "PR006",
    hospital: "Kokilaben Hospital",
    address: "987 Medical Park, Mumbai",
    wasteType: "General",
    weight: "56 kg",
    priority: "normal",
    requestedDate: "2024-01-18",
    requestedTime: "09:00 AM",
    status: "scheduled",
    contact: "+91 22-7890-1234",
    notes: "Daily routine pickup",
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "outline";
    case "assigned":
      return "secondary";
    case "in-progress":
      return "default";
    case "scheduled":
      return "secondary";
    case "completed":
      return "default";
    default:
      return "outline";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "destructive";
    case "normal":
      return "secondary";
    case "low":
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
      return <Package className="h-4 w-4" />;
  }
};

export default function PickupRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<typeof mockRequests[0] | null>(null);

  const filteredRequests = mockRequests.filter((request) => {
    const matchesSearch =
      request.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || request.status === selectedStatus;
    const matchesPriority = selectedPriority === "all" || request.priority === selectedPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: mockRequests.length,
    pending: mockRequests.filter((r) => r.status === "pending").length,
    inProgress: mockRequests.filter((r) => r.status === "in-progress").length,
    highPriority: mockRequests.filter((r) => r.priority === "high").length,
  };

  const handleAccept = (id: string) => {
    toast.success(`Request ${id} accepted`);
  };

  const handleStartPickup = (id: string) => {
    toast.success(`Pickup started for ${id}`);
  };

  return (
    <DashboardLayout
      role="waste-management"
      title="Pickup Requests"
      breadcrumbs={[
        { label: "Dashboard", href: "/waste-management" },
        { label: "Pickup Requests" },
      ]}
      userName="Waste Operator"
      userRole="Waste Collection Team"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Requests"
            value={stats.total}
            icon={ClipboardList}
            subtitle="Today"
          />
          <StatsCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            subtitle="Awaiting pickup"
            className="border-yellow-200 dark:border-yellow-900"
          />
          <StatsCard
            title="In Progress"
            value={stats.inProgress}
            icon={Truck}
            subtitle="Currently collecting"
            className="border-blue-200 dark:border-blue-900"
          />
          <StatsCard
            title="High Priority"
            value={stats.highPriority}
            icon={AlertTriangle}
            subtitle="Urgent pickups"
            className="border-red-200 dark:border-red-900"
          />
        </DashboardGrid>

        {/* Filters */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search hospitals or IDs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </AnimatedCard>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className={cn(
                  "rounded-lg border p-4 transition-all hover:shadow-md",
                  request.priority === "high" && "border-l-4 border-l-red-500"
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-muted-foreground">{request.id}</span>
                      <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                      <Badge variant={getPriorityColor(request.priority)}>{request.priority} priority</Badge>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg">{request.hospital}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {request.address}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(request.wasteType)}
                        <span>{request.wasteType}</span>
                        <span className="text-muted-foreground">({request.weight})</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {request.requestedDate} • {request.requestedTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 lg:flex-col">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Request Details - {request.id}</DialogTitle>
                          <DialogDescription>{request.hospital}</DialogDescription>
                        </DialogHeader>
                        {selectedRequest && (
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedRequest.address}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{selectedRequest.contact}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Waste Type</p>
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(selectedRequest.wasteType)}
                                  <span className="font-medium">{selectedRequest.wasteType}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Weight</p>
                                <p className="font-medium">{selectedRequest.weight}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Notes</p>
                              <p className="text-sm">{selectedRequest.notes}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant={getStatusColor(selectedRequest.status)}>
                                {selectedRequest.status}
                              </Badge>
                              <Badge variant={getPriorityColor(selectedRequest.priority)}>
                                {selectedRequest.priority} priority
                              </Badge>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    {request.status === "pending" && (
                      <Button size="sm" onClick={() => handleAccept(request.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Accept
                      </Button>
                    )}
                    {request.status === "assigned" && (
                      <Button size="sm" onClick={() => handleStartPickup(request.id)}>
                        <Truck className="mr-2 h-4 w-4" />
                        Start Pickup
                      </Button>
                    )}
                    {request.status === "in-progress" && (
                      <Button size="sm" variant="outline">
                        <Navigation className="mr-2 h-4 w-4" />
                        Navigate
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
