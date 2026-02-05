"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  StatsCard,
  AnimatedCard,
  DataTable,
  StatusBadge,
  FeaturesGrid,
  FeatureDetailDialog,
  wasteManagementFeatures,
  MetricCard,
  ActivityItem,
  StatusOverview,
} from "@/components/dashboard";
import {
  Truck,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  MapPin,
  Download,
  Search,
  MoreHorizontal,
  RefreshCw,
  Activity,
  Recycle,
  BarChart3,
  Bell,
  Filter,
  Route,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/auth/auth-context";
import { useWebSocketContext } from "@/lib/hooks/use-websocket";
import {
  usePickupRequests,
  useCollectWaste,
  useDisposeWaste,
} from "@/lib/hooks";
import type { PickupRequestView } from "@/lib/api/types";
import type { DataTableColumn } from "@/components/dashboard/data-table";

// Type for table data with id
type PickupRequestTableRow = PickupRequestView & { id: string };

const wasteTypeColors: Record<string, string> = {
  infectious: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  hazardous: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  radioactive: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  general: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sharps: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  pharmaceutical: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

// Loading skeleton
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardGrid cols={4}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </DashboardGrid>
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}

export default function WasteManagementDashboard() {
  // Auth check
  const { user, isLoading: authLoading } = useRequireAuth(["waste_team"]);
  
  // WebSocket for real-time updates
  const { isConnected, subscribe } = useWebSocketContext();
  
  // API data hooks
  const { data: pickupData, isLoading: requestsLoading, refetch: refetchRequests } = usePickupRequests();
  
  // Extract requests array from PickupRequestList
  const pickupRequests: PickupRequestView[] = (pickupData as { items?: PickupRequestView[] } | undefined)?.items || [];
  
  // Mutations
  const collectWaste = useCollectWaste();
  const disposeWaste = useDisposeWaste();
  
  // UI state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFeature, setSelectedFeature] = useState<typeof wasteManagementFeatures[0] | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Mock data for schedule and activities
  const todaySchedule = [
    { time: "06:00", title: "Morning Route - Zone A", description: "Metro Hospital, City General, Sunrise Clinic" },
    { time: "09:00", title: "Special Collection - Hazardous", description: "Radioactive waste pickup at Nuclear Medicine Center" },
    { time: "12:00", title: "Afternoon Route - Zone B", description: "District Hospital, Community Health Center" },
    { time: "15:00", title: "Disposal Run", description: "Transport to Central Incineration Facility" },
  ];
  
  const recentActivities = [
    { type: "success" as const, message: "Waste disposed: 45kg infectious waste at Central Facility", time: "15 min ago" },
    { type: "info" as const, message: "Collection completed: Metro Hospital - 32kg", time: "45 min ago" },
    { type: "warning" as const, message: "New urgent pickup request from District Hospital", time: "1 hour ago" },
    { type: "success" as const, message: "Route Zone A completed - 4 hospitals serviced", time: "2 hours ago" },
    { type: "info" as const, message: "Vehicle maintenance scheduled for Truck #3", time: "3 hours ago" },
    { type: "alert" as const, message: "Hazardous waste alert: Radioactive pickup pending", time: "4 hours ago" },
  ];

  const handleFeatureClick = (feature: typeof wasteManagementFeatures[0]) => {
    setSelectedFeature(feature);
    setFeatureDialogOpen(true);
  };

  // Subscribe to real-time events
  useEffect(() => {
    const unsubWaste = subscribe("waste.collected", () => {
      refetchRequests();
    });
    
    const unsubDisposed = subscribe("waste.disposed", () => {
      refetchRequests();
    });
    
    return () => {
      unsubWaste();
      unsubDisposed();
    };
  }, [subscribe, refetchRequests]);

  // Loading state
  if (authLoading || (requestsLoading && pickupRequests.length === 0)) {
    return (
      <DashboardLayout
        role="waste-management"
        title="Waste Management Portal"
        breadcrumbs={[{ label: "Waste Management", href: "/waste-management" }, { label: "Dashboard" }]}
        userName={user?.displayName || "Loading..."}
        userRole="Operations Manager"
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  // Calculate stats - "requested" is the pending status in the API
  const pendingRequests = pickupRequests.filter((r: PickupRequestView) => r.status === "requested");
  const collectedRequests = pickupRequests.filter((r: PickupRequestView) => r.status === "collected");
  const disposedRequests = pickupRequests.filter((r: PickupRequestView) => r.status === "disposed");
  const totalPendingKg = pendingRequests.reduce((acc: number, r: PickupRequestView) => acc + (r.reported_waste_kg || 0), 0);

  const filteredRequests = pickupRequests.filter((r: PickupRequestView) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch =
      r.hospital_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }).map((r: PickupRequestView) => ({ ...r, id: r.request_id }));

  const handleMarkCollected = async (request: PickupRequestView) => {
    try {
      await collectWaste.mutateAsync({
        requestId: request.request_id,
        data: { collected_kg: request.reported_waste_kg }
      });
      toast.success("Marked as collected", {
        description: `Waste from ${request.hospital_name} has been collected`,
      });
    } catch (error) {
      toast.error("Failed to mark as collected");
    }
  };

  const handleMarkDisposed = async (request: PickupRequestView) => {
    try {
      await disposeWaste.mutateAsync({
        requestId: request.request_id,
        data: {
          disposed_kg: request.collected_kg || request.reported_waste_kg,
          disposal_method: "incineration",
          disposal_facility: "City Medical Waste Facility"
        }
      });
      toast.success("Marked as disposed", {
        description: `Waste from ${request.hospital_name} has been safely disposed`,
      });
    } catch (error) {
      toast.error("Failed to mark as disposed");
    }
  };

  const requestColumns: DataTableColumn<PickupRequestTableRow>[] = [
    {
      key: "hospital_name",
      header: "Hospital",
      render: (request) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{request.hospital_name}</p>
            <p className="text-xs text-muted-foreground">ID: {request.request_id}</p>
          </div>
        </div>
      ),
    },
    {
      key: "total_kg",
      header: "Quantity",
      render: (request) => (
        <span className="font-mono font-medium">
          {request.reported_waste_kg?.toFixed(1) || 0} kg
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (request) => <StatusBadge status={request.status} />,
    },
    {
      key: "requested_at",
      header: "Requested",
      render: (request) => (
        <span className="text-sm text-muted-foreground">
          {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (request) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {request.status === "requested" && (
              <DropdownMenuItem onClick={() => handleMarkCollected(request)}>
                <Truck className="mr-2 h-4 w-4" />
                Mark Collected
              </DropdownMenuItem>
            )}
            {request.status === "collected" && (
              <DropdownMenuItem onClick={() => handleMarkDisposed(request)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark Disposed
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout
      role="waste-management"
      title="Waste Management Portal"
      breadcrumbs={[
        { label: "Waste Management", href: "/waste-management" },
        { label: "Dashboard" },
      ]}
      userName={user?.displayName || "Waste Operations"}
      userRole="Operations Manager"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            Connecting to real-time updates...
          </div>
        )}

        {/* Stats Cards */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Pending Pickups"
            value={pendingRequests.length}
            subtitle="Awaiting collection"
            icon={Clock}
            iconColor="bg-gradient-to-br from-yellow-500 to-yellow-600"
          />
          <StatsCard
            title="Collected"
            value={collectedRequests.length}
            subtitle="Ready for disposal"
            icon={Truck}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            title="Disposed"
            value={disposedRequests.length}
            subtitle="Safely processed"
            icon={CheckCircle}
            iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
          <StatsCard
            title="Pending Waste"
            value={`${totalPendingKg.toFixed(0)} kg`}
            subtitle="Awaiting pickup"
            icon={Package}
            iconColor="bg-gradient-to-br from-violet-500 to-violet-600"
          />
        </DashboardGrid>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Recycle className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="routes" className="flex items-center gap-2">
              <Route className="h-4 w-4" />
              Routes
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search hospitals..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="requested">Pending</SelectItem>
                    <SelectItem value="collected">Collected</SelectItem>
                    <SelectItem value="disposed">Disposed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => refetchRequests()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pending Requests Cards */}
            <DashboardSection title="Pending Pickups" description="Requests awaiting collection">
              {requestsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-40 rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pendingRequests.map((request, index) => (
                    <motion.div
                      key={request.request_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5"
                    >
                      {/* Urgency indicator */}
                      <div className="absolute left-0 top-0 h-1 w-full bg-yellow-500" />

                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{request.hospital_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Requested: {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-bold">
                            {request.reported_waste_kg?.toFixed(1) || 0} kg
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {request.notes || "No notes"}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleMarkCollected(request)}
                          disabled={collectWaste.isPending}
                        >
                          {collectWaste.isPending ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Truck className="mr-2 h-4 w-4" />
                          )}
                          Collect
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {pendingRequests.length === 0 && !requestsLoading && (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
                  <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending requests</p>
                </div>
              )}
            </DashboardSection>

            {/* All Requests Table */}
            <DashboardSection title="All Requests">
              {requestsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <DataTable
                  data={filteredRequests}
                  columns={requestColumns}
                  emptyMessage="No waste pickup requests found"
                />
              )}
            </DashboardSection>

            {/* Disposal History */}
            <AnimatedCard>
              <h3 className="mb-4 font-semibold">Recent Disposal History</h3>
              <div className="space-y-4">
                {disposedRequests.slice(0, 5).map((request, index) => (
                  <motion.div
                    key={request.request_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 rounded-lg border border-border/50 p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950">
                      <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{request.hospital_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.reported_waste_kg?.toFixed(1) || 0} kg of waste
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status="disposed" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {request.disposed_at ? new Date(request.disposed_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {disposedRequests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No disposal history available</p>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <FeaturesGrid
              features={wasteManagementFeatures}
              onFeatureClick={handleFeatureClick}
            />
          </TabsContent>

          {/* Routes Tab */}
          <TabsContent value="routes" className="space-y-6">
            {/* Route Map */}
            <AnimatedCard delay={0.1}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Today's Collection Route</h3>
                  <p className="text-sm text-muted-foreground">Optimized pickup route for efficiency</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <MapPin className="mr-2 h-4 w-4" />
                    Full Map
                  </Button>
                </div>
              </div>

              <div className="relative h-80 overflow-hidden rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                {/* Simple route visualization */}
                <svg className="absolute inset-0 h-full w-full">
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="rgb(59, 130, 246)" />
                      <stop offset="100%" stopColor="rgb(6, 182, 212)" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 50 200 Q 150 50 250 140 T 450 80 T 650 170"
                    stroke="url(#routeGradient)"
                    strokeWidth="3"
                    strokeDasharray="10 5"
                    fill="none"
                    className="animate-pulse"
                  />
                </svg>

                {/* Route stops */}
                {pendingRequests.slice(0, 5).map((request, index) => (
                  <motion.div
                    key={request.request_id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    style={{
                      left: `${10 + index * 18}%`,
                      top: `${25 + (index % 2) * 35}%`,
                    }}
                    className="absolute"
                  >
                    <div className="flex flex-col items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg">
                        <span className="text-sm font-bold text-primary-foreground">{index + 1}</span>
                      </div>
                      <div className="mt-2 max-w-28 text-center">
                        <p className="truncate text-xs font-medium">{request.hospital_name}</p>
                        <p className="text-[10px] text-muted-foreground">{request.reported_waste_kg?.toFixed(0) || 0} kg</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Legend */}
                <div className="absolute bottom-4 left-4 flex items-center gap-4 rounded-lg bg-background/80 px-3 py-2 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs">Collection Points</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-0.5 w-4 bg-gradient-to-r from-blue-500 to-cyan-500" style={{ borderStyle: 'dashed' }} />
                    <span className="text-xs">Optimized Route</span>
                  </div>
                </div>
              </div>
            </AnimatedCard>

            {/* Route Statistics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Stops"
                value={pendingRequests.length}
                subValue="Collection points today"
              />
              <MetricCard
                label="Total Distance"
                value="42.5 km"
                subValue="Estimated route length"
              />
              <MetricCard
                label="Est. Duration"
                value="3.5 hrs"
                subValue="Based on current traffic"
              />
              <MetricCard
                label="Total Waste"
                value={`${totalPendingKg.toFixed(0)} kg`}
                subValue="To be collected"
              />
            </div>

            {/* Route Schedule */}
            <AnimatedCard delay={0.2}>
              <div className="mb-4">
                <h3 className="font-semibold">Route Schedule</h3>
                <p className="text-sm text-muted-foreground">Planned collection times</p>
              </div>
              <div className="space-y-3">
                {todaySchedule.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-lg font-semibold text-primary">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedCard>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Today's Schedule */}
              <AnimatedCard delay={0.1} className="lg:col-span-1">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Today's Tasks</h3>
                  <Button variant="ghost" size="sm">View All</Button>
                </div>
                <div className="space-y-3">
                  {todaySchedule.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex gap-3 rounded-lg border p-3"
                    >
                      <div className="text-sm font-medium text-primary">{item.time}</div>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatedCard>

              {/* Activity Feed */}
              <AnimatedCard delay={0.2} className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Recent Activity</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export Log
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {recentActivities.map((activity, index) => (
                    <ActivityItem
                      key={index}
                      type={activity.type}
                      message={activity.message}
                      time={activity.time}
                      index={index}
                    />
                  ))}
                </div>
              </AnimatedCard>
            </div>

            {/* Waste Type Distribution */}
            <AnimatedCard delay={0.3}>
              <div className="mb-4">
                <h3 className="font-semibold">Waste Type Distribution</h3>
                <p className="text-sm text-muted-foreground">Breakdown of collected waste types</p>
              </div>
              <StatusOverview
                items={[
                  { label: "Infectious", value: 45, color: "bg-red-500" },
                  { label: "Hazardous", value: 28, color: "bg-orange-500" },
                  { label: "Pharmaceutical", value: 15, color: "bg-blue-500" },
                  { label: "Sharps", value: 8, color: "bg-purple-500" },
                  { label: "General", value: 4, color: "bg-gray-500" },
                ]}
              />
            </AnimatedCard>

            {/* Quick Actions */}
            <AnimatedCard delay={0.4}>
              <div className="mb-4">
                <h3 className="font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Common waste management operations</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <Truck className="h-5 w-5" />
                  <span>Start Collection</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <Route className="h-5 w-5" />
                  <span>Optimize Route</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Report Incident</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <BarChart3 className="h-5 w-5" />
                  <span>View Analytics</span>
                </Button>
              </div>
            </AnimatedCard>

            {/* Fleet Status */}
            <AnimatedCard delay={0.5}>
              <div className="mb-4">
                <h3 className="font-semibold">Fleet Status</h3>
                <p className="text-sm text-muted-foreground">Current vehicle availability</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Truck #1</p>
                    <p className="text-xs text-muted-foreground">On Route - Zone A</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Truck #2</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Truck #3</p>
                    <p className="text-xs text-muted-foreground">Maintenance</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Truck #4</p>
                    <p className="text-xs text-muted-foreground">At Disposal Facility</p>
                  </div>
                </div>
              </div>
            </AnimatedCard>
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
