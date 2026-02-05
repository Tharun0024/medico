"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  StatsCard,
  AlertBanner,
  AnimatedCard,
  DataTable,
  StatusBadge,
  FeaturesGrid,
  FeatureDetailDialog,
  hospitalAdminFeatures,
  MetricCard,
  ActivityItem,
  StatusOverview,
  ScheduleItem,
} from "@/components/dashboard";
import {
  Bed,
  Users,
  Trash2,
  AlertTriangle,
  Clock,
  Bell,
  Plus,
  Download,
  RefreshCw,
  Calendar,
  FileText,
  Settings,
  Activity,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useRequireAuth } from "@/lib/auth/auth-context";
import { useWebSocketContext } from "@/lib/hooks/use-websocket";
import {
  useWardStatus,
  useWastePrediction,
  useRequestPickup,
} from "@/lib/hooks";
import { notificationsApi } from "@/lib/api";
import type { WardCapacityStatus, WastePrediction, NotificationResponse, Notification } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const wasteChartConfig = {
  actual: { label: "Actual Waste", color: "hsl(var(--chart-1))" },
  predicted: { label: "AI Predicted", color: "hsl(var(--chart-2))" },
};

// Mock schedule data for Hospital Admin
const todaySchedule = [
  { title: "Morning Staff Briefing", time: "08:00 AM - 08:30 AM", status: "completed" as const, priority: "medium" as const },
  { title: "Ward Inspection - ICU", time: "09:00 AM - 10:00 AM", status: "completed" as const, priority: "high" as const },
  { title: "Waste Collection Review", time: "11:00 AM - 11:30 AM", status: "in-progress" as const, priority: "medium" as const },
  { title: "Budget Meeting", time: "02:00 PM - 03:00 PM", status: "upcoming" as const, priority: "high" as const },
  { title: "Emergency Drill", time: "04:00 PM - 05:00 PM", status: "upcoming" as const, priority: "high" as const },
];

// Mock recent activities
const recentActivities = [
  { title: "Patient Admitted", description: "New patient admitted to ICU Ward", time: "5 min ago", icon: Users, type: "info" as const },
  { title: "Bed Released", description: "Bed GEN-205 now available after cleaning", time: "15 min ago", icon: Bed, type: "success" as const },
  { title: "Waste Alert", description: "Waste collection threshold exceeded", time: "30 min ago", icon: Trash2, type: "warning" as const },
  { title: "Critical Alert", description: "ICU occupancy above 90%", time: "1 hour ago", icon: AlertTriangle, type: "error" as const },
  { title: "Staff Update", description: "Night shift rotation completed", time: "2 hours ago", icon: Clock, type: "info" as const },
];

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardGrid cols={4}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </DashboardGrid>
      <Skeleton className="h-[300px] rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[400px] rounded-xl lg:col-span-2" />
        <div className="space-y-6">
          <Skeleton className="h-[180px] rounded-xl" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function HospitalAdminDashboard() {
  // Auth check - requires hospital_admin role
  const { user, isLoading: authLoading } = useRequireAuth(["hospital_admin"]);
  
  // WebSocket for real-time updates
  const { isConnected, subscribe } = useWebSocketContext();
  
  // API data hooks
  const { data: wardStatus, isLoading: wardLoading, refetch: refetchWard } = useWardStatus();
  const { data: wastePrediction, isLoading: wasteLoading } = useWastePrediction();
  
  // Notifications query
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getNotifications(),
  });
  
  // Mutations
  const requestPickup = useRequestPickup();
  
  // UI state
  const [showWasteAlert, setShowWasteAlert] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<typeof hospitalAdminFeatures[0] | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Subscribe to real-time events
  useEffect(() => {
    const unsubBed = subscribe("bed.updated", () => {
      refetchWard();
    });
    
    const unsubPatient = subscribe("patient.admitted", () => {
      refetchWard();
    });
    
    const unsubDischarge = subscribe("patient.discharged", () => {
      refetchWard();
    });
    
    return () => {
      unsubBed();
      unsubPatient();
      unsubDischarge();
    };
  }, [subscribe, refetchWard]);

  // Loading state
  if (authLoading || (wardLoading && !wardStatus)) {
    return (
      <DashboardLayout
        role="hospital-admin"
        title="Hospital Control Panel"
        breadcrumbs={[{ label: "Hospital Admin", href: "/hospital-admin" }, { label: "Dashboard" }]}
        userName={user?.displayName || "Loading..."}
        userRole="Hospital Administrator"
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  // Calculate bed statistics from updated_wards (actual API response)
  const rawWards = wardStatus?.updated_wards || [];
  // Add id field for DataTable compatibility
  const wards = rawWards.map((w, idx) => ({ ...w, id: String(w.bed_group_id || idx) }));
  const totalBeds = wards.reduce((sum, w) => sum + w.new_capacity, 0);
  const occupiedBeds = wards.reduce((sum, w) => sum + w.occupied, 0);
  const freeBeds = wards.reduce((sum, w) => sum + w.available, 0);
  const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

  // Get waste prediction status
  const predictedWaste = wastePrediction?.predicted_daily_kg || 0;
  const wasteByWard = wastePrediction?.by_ward || [];
  const collectionRecommended = wastePrediction?.collection_recommended || false;
  const recommendation = wastePrediction?.recommendation || "";
  const alertLevel = wastePrediction?.alert_level || "normal";

  // Ward status columns for table
  const wardColumns = [
    { 
      key: "ward_type", 
      header: "Ward Type",
      render: (ward: WardCapacityStatus) => (
        <span className="uppercase text-xs font-semibold">{ward.ward_type}</span>
      ),
    },
    { 
      key: "new_capacity", 
      header: "Capacity",
      render: (ward: WardCapacityStatus) => ward.new_capacity,
    },
    { 
      key: "occupied", 
      header: "Occupied",
      render: (ward: WardCapacityStatus) => ward.occupied,
    },
    {
      key: "available",
      header: "Available",
      render: (ward: WardCapacityStatus) => ward.available,
    },
    {
      key: "occupancy_percentage",
      header: "Occupancy",
      render: (ward: WardCapacityStatus) => (
        <span className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          ward.occupancy_percentage > 90 
            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
            : ward.occupancy_percentage > 70 
            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
            : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
        )}>
          {ward.occupancy_percentage.toFixed(0)}%
        </span>
      ),
    },
  ];

  const handleRequestWastePickup = async () => {
    await requestPickup.mutateAsync({
      urgency: alertLevel === "critical" ? "critical" : alertLevel === "warning" ? "urgent" : "normal",
      notes: "Routine pickup request from hospital admin dashboard",
    });
  };

  // Prepare waste chart data from ward predictions
  const wasteChartData = wasteByWard.map((ward) => ({
    ward: ward.ward_type.toUpperCase(),
    predicted: ward.predicted_daily_kg,
    beds: ward.occupied_beds,
  }));

  // Bed status data for pie chart
  const bedStatusData = [
    { name: "Occupied", value: occupiedBeds, color: "#3b82f6" },
    { name: "Available", value: freeBeds, color: "#10b981" },
    { name: "Cleaning", value: Math.floor(totalBeds * 0.05), color: "#f59e0b" },
    { name: "Reserved", value: Math.floor(totalBeds * 0.03), color: "#8b5cf6" },
  ];

  // Get notifications list and transform to UI format
  const rawNotifications = (notifications as { items?: Notification[] } | undefined)?.items || [];
  const notificationsList: NotificationResponse[] = rawNotifications.map(n => ({
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.severity === 'error' || n.severity === 'critical' ? 'error' 
        : n.severity === 'warning' ? 'warning' 
        : n.severity === 'info' ? 'info' 
        : 'success',
    read: n.read_at !== null,
    created_at: n.created_at,
  }));

  const handleFeatureClick = (feature: typeof hospitalAdminFeatures[0]) => {
    setSelectedFeature(feature);
    setFeatureDialogOpen(true);
  };

  return (
    <DashboardLayout
      role="hospital-admin"
      title="Hospital Control Panel"
      breadcrumbs={[
        { label: "Hospital Admin", href: "/hospital-admin" },
        { label: "Dashboard" },
      ]}
      userName={user?.displayName || "Hospital Admin"}
      userRole="Hospital Administrator"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <AlertBanner
            type="info"
            title="Connecting to Real-time Updates"
            message="Establishing connection to receive live bed and patient updates..."
          />
        )}

        {/* Waste Collection Alert */}
        {showWasteAlert && collectionRecommended && (
          <AlertBanner
            type={alertLevel === "critical" ? "error" : alertLevel === "warning" ? "warning" : "info"}
            title="Waste Collection Recommended"
            message={recommendation}
            onDismiss={() => setShowWasteAlert(false)}
          />
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">All Features</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <DashboardGrid cols={4}>
              <StatsCard
                title="Total Beds"
                value={totalBeds}
                subtitle="Hospital capacity"
                icon={Bed}
                iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
              />
              <StatsCard
                title="Occupied Beds"
                value={occupiedBeds}
                subtitle={`${occupancyRate.toFixed(0)}% occupancy`}
                icon={Users}
                iconColor="bg-gradient-to-br from-orange-500 to-orange-600"
                trend={{ value: occupancyRate > 80 ? 5 : -5, isPositive: occupancyRate <= 80 }}
              />
              <StatsCard
                title="Available Beds"
                value={freeBeds}
                subtitle="Ready for patients"
                icon={Bed}
                iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
              />
              <StatsCard
                title="Active Wards"
                value={wards.length}
                subtitle="ICU, HDU, General"
                icon={Layers}
                iconColor="bg-gradient-to-br from-violet-500 to-violet-600"
              />
            </DashboardGrid>

            {/* Quick Actions Row */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info("Opening bed management...")}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                  <Bed className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Manage Beds</p>
                  <p className="text-xs text-muted-foreground">{freeBeds} available</p>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleRequestWastePickup}
                disabled={requestPickup.isPending}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500">
                  <Trash2 className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Request Pickup</p>
                  <p className="text-xs text-muted-foreground">{predictedWaste.toFixed(0)} kg predicted</p>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info("Opening reports...")}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">View Reports</p>
                  <p className="text-xs text-muted-foreground">Daily summaries</p>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toast.info("Opening settings...")}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4 transition-all hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500">
                  <Settings className="h-5 w-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Settings</p>
                  <p className="text-xs text-muted-foreground">Configure hospital</p>
                </div>
              </motion.button>
            </div>
        {/* Ward Status Section */}
        <DashboardSection
          title="Ward Status"
          description="Real-time ward capacity and occupancy"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetchWard()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          }
        >
          {wardLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (
            <DataTable data={wards} columns={wardColumns} />
          )}
        </DashboardSection>

        {/* Waste Analytics Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Waste Prediction Chart */}
          <div className="lg:col-span-2">
            <DashboardSection
              title="Waste Forecast by Ward"
              description="AI-powered daily waste prediction based on occupancy"
            >
              {wasteLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ChartContainer config={wasteChartConfig} className="h-[300px] w-full">
                  <AreaChart data={wasteChartData}>
                    <defs>
                      <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="ward" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="predicted"
                      stroke="hsl(var(--primary))"
                      fill="url(#predictedGradient)"
                      strokeWidth={2}
                      name="Predicted (kg/day)"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </DashboardSection>
          </div>

          {/* Waste Summary Card */}
          <div className="space-y-6">
            <AnimatedCard delay={0.1}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Medical Waste Prediction</h3>
                  <p className="text-sm text-muted-foreground">AI-powered forecast</p>
                </div>
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  alertLevel === "critical" ? "bg-red-100 dark:bg-red-950" :
                  alertLevel === "warning" ? "bg-yellow-100 dark:bg-yellow-950" : 
                  "bg-emerald-100 dark:bg-emerald-950"
                )}>
                  <Trash2 className={cn(
                    "h-5 w-5",
                    alertLevel === "critical" ? "text-red-600" :
                    alertLevel === "warning" ? "text-yellow-600" : 
                    "text-emerald-600"
                  )} />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{predictedWaste.toFixed(1)} kg</p>
                    <p className="text-xs text-muted-foreground">Predicted daily</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-muted-foreground">
                      {wastePrediction?.predicted_weekly_kg?.toFixed(1) || "N/A"} kg
                    </p>
                    <p className="text-xs text-muted-foreground">Weekly forecast</p>
                  </div>
                </div>

                {collectionRecommended && (
                  <div className={cn(
                    "flex items-center gap-2 rounded-lg p-3",
                    alertLevel === "critical" ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200" :
                    "bg-yellow-50 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-200"
                  )}>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs">{recommendation}</span>
                  </div>
                )}
              </div>
            </AnimatedCard>

            {/* Waste Pickup Request */}
            <AnimatedCard delay={0.2}>
              <h3 className="mb-4 font-semibold">Waste Collection</h3>
              
              <div className="mb-4 space-y-3">
                {wasteByWard.slice(0, 3).map((ward) => (
                  <div key={ward.ward_type} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <span className="text-sm uppercase">{ward.ward_type}</span>
                    <span className="text-sm font-medium">{ward.predicted_daily_kg.toFixed(1)} kg/day</span>
                  </div>
                ))}
              </div>

              <Button 
                className="w-full" 
                onClick={handleRequestWastePickup}
                disabled={requestPickup.isPending}
              >
                {requestPickup.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : requestPickup.isSuccess ? (
                  <>
                    <span className="mr-2">✓</span>
                    Request Sent!
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Request Waste Pickup
                  </>
                )}
              </Button>
            </AnimatedCard>
          </div>
        </div>

        {/* Today's Schedule & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Schedule */}
          <AnimatedCard delay={0.3}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Today&apos;s Schedule</h3>
                <p className="text-sm text-muted-foreground">Your activities for today</p>
              </div>
              <Button variant="outline" size="sm">
                <Calendar className="mr-2 h-4 w-4" />
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {todaySchedule.map((item, index) => (
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

          {/* Recent Activity */}
          <AnimatedCard delay={0.4}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Recent Activity</h3>
                <p className="text-sm text-muted-foreground">Latest updates from your hospital</p>
              </div>
              <Button variant="outline" size="sm">
                <Activity className="mr-2 h-4 w-4" />
                View All
              </Button>
            </div>
            <div className="space-y-1">
              {recentActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  title={activity.title}
                  description={activity.description}
                  time={activity.time}
                  icon={activity.icon}
                  type={activity.type}
                />
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Notifications Panel */}
        <DashboardSection title="Recent Notifications">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notificationsList.slice(0, 6).map((notification: NotificationResponse, index: number) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "rounded-xl border border-border/50 bg-card p-4 transition-all hover:shadow-md",
                  !notification.read && "border-l-4 border-l-primary"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg",
                    notification.type === "error" && "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
                    notification.type === "warning" && "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
                    notification.type === "success" && "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
                    notification.type === "info" && "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  )}>
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardSection>
          </TabsContent>

          {/* All Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <DashboardSection
              title="Hospital Admin Features"
              description="All available features and tools for hospital administration"
            >
              <FeaturesGrid features={hospitalAdminFeatures} onFeatureClick={handleFeatureClick} />
            </DashboardSection>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <DashboardGrid cols={4}>
              <MetricCard
                title="ICU Utilization"
                value={Math.round(occupiedBeds * 0.3)}
                max={Math.round(totalBeds * 0.15) || 1}
                icon={Activity}
                iconColor="text-red-500"
                delay={0}
              />
              <MetricCard
                title="HDU Utilization"
                value={Math.round(occupiedBeds * 0.25)}
                max={Math.round(totalBeds * 0.25) || 1}
                icon={Activity}
                iconColor="text-orange-500"
                delay={0.1}
              />
              <MetricCard
                title="General Ward"
                value={Math.round(occupiedBeds * 0.45)}
                max={Math.round(totalBeds * 0.6) || 1}
                icon={Bed}
                iconColor="text-blue-500"
                delay={0.2}
              />
              <MetricCard
                title="Staff On Duty"
                value={45}
                max={60}
                icon={Users}
                iconColor="text-emerald-500"
                delay={0.3}
              />
            </DashboardGrid>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Bed Status Distribution */}
              <AnimatedCard delay={0.1}>
                <div className="mb-4">
                  <h3 className="font-semibold">Bed Status Distribution</h3>
                  <p className="text-sm text-muted-foreground">Current allocation overview</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bedStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {bedStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </AnimatedCard>

              {/* Weekly Trends */}
              <AnimatedCard delay={0.2}>
                <div className="mb-4">
                  <h3 className="font-semibold">Weekly Admission Trends</h3>
                  <p className="text-sm text-muted-foreground">Admissions over the past week</p>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { day: "Mon", admissions: 12, discharges: 8 },
                      { day: "Tue", admissions: 15, discharges: 10 },
                      { day: "Wed", admissions: 18, discharges: 14 },
                      { day: "Thu", admissions: 14, discharges: 12 },
                      { day: "Fri", admissions: 20, discharges: 16 },
                      { day: "Sat", admissions: 10, discharges: 8 },
                      { day: "Sun", admissions: 8, discharges: 6 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <ChartTooltip />
                      <Bar dataKey="admissions" fill="#3b82f6" name="Admissions" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="discharges" fill="#10b981" name="Discharges" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AnimatedCard>
            </div>

            {/* Status Overview Cards */}
            <div className="grid gap-6 lg:grid-cols-3">
              <StatusOverview
                title="Patient Severity"
                total={occupiedBeds || 1}
                items={[
                  { label: "Critical", value: Math.round(occupiedBeds * 0.1), color: "bg-red-500" },
                  { label: "Serious", value: Math.round(occupiedBeds * 0.2), color: "bg-orange-500" },
                  { label: "Stable", value: Math.round(occupiedBeds * 0.5), color: "bg-yellow-500" },
                  { label: "Minor", value: Math.round(occupiedBeds * 0.2), color: "bg-green-500" },
                ]}
              />
              <StatusOverview
                title="Waste by Type"
                total={Math.round(predictedWaste) || 1}
                items={[
                  { label: "Infectious", value: Math.round(predictedWaste * 0.4), color: "bg-red-500" },
                  { label: "Hazardous", value: Math.round(predictedWaste * 0.25), color: "bg-orange-500" },
                  { label: "Sharps", value: Math.round(predictedWaste * 0.15), color: "bg-yellow-500" },
                  { label: "General", value: Math.round(predictedWaste * 0.2), color: "bg-gray-500" },
                ]}
              />
              <StatusOverview
                title="Staff Distribution"
                total={60}
                items={[
                  { label: "Doctors", value: 15, color: "bg-blue-500" },
                  { label: "Nurses", value: 30, color: "bg-emerald-500" },
                  { label: "Technicians", value: 10, color: "bg-violet-500" },
                  { label: "Support", value: 5, color: "bg-gray-500" },
                ]}
              />
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <DashboardSection
              title="Activity Log"
              description="Complete log of all hospital activities"
              action={
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Log
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
