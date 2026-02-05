"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  StatsCard,
  AlertBanner,
  AnimatedCard,
  DataTable,
  StatusBadge,
  HospitalMap,
  FeaturesGrid,
  FeatureDetailDialog,
  superAdminFeatures,
  MetricCard,
  ActivityItem,
  StatusOverview,
} from "@/components/dashboard";
import {
  Building2,
  Users,
  Bed,
  AlertTriangle,
  TrendingUp,
  Activity,
  Plus,
  Filter,
  RefreshCw,
  Send,
  Shield,
  MapPin,
  Download,
  FileText,
  Bell,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useRequireAuth } from "@/lib/auth/auth-context";
import { useWebSocketContext } from "@/lib/hooks/use-websocket";
import {
  useBedSummary,
  useDiseaseTrends,
  useOutbreakRisk,
  useCreateHospital,
  useSendNotice,
} from "@/lib/hooks";
import type {
  HospitalBedSummary,
  HospitalCreateRequest,
  AdminNoticeRequest,
} from "@/lib/api/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const chartConfig = {
  critical: { label: "Critical", color: "hsl(var(--chart-1))" },
  high: { label: "High", color: "hsl(var(--chart-2))" },
  normal: { label: "Normal", color: "hsl(var(--chart-3))" },
};

const pieColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

// Loading skeleton component
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <DashboardGrid cols={4}>
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </DashboardGrid>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
      <Skeleton className="h-[400px] rounded-xl" />
    </div>
  );
}

export default function SuperAdminDashboard() {
  // Auth check
  const { user, isLoading: authLoading } = useRequireAuth(["super_admin"]);
  
  // WebSocket for real-time updates
  const { isConnected, subscribe } = useWebSocketContext();
  
  // API data hooks
  const { data: bedSummary, isLoading: bedLoading, refetch: refetchBeds } = useBedSummary();
  const { data: diseaseTrends, isLoading: trendsLoading } = useDiseaseTrends(30);
  const { data: outbreakRisk, isLoading: riskLoading } = useOutbreakRisk();
  
  // Mutations
  const createHospital = useCreateHospital();
  const sendNotice = useSendNotice();
  
  // UI state
  const [selectedHospital, setSelectedHospital] = useState<HospitalBedSummary | null>(null);
  const [showOutbreakAlert, setShowOutbreakAlert] = useState(true);
  const [isAddHospitalOpen, setIsAddHospitalOpen] = useState(false);
  const [isSendNoticeOpen, setIsSendNoticeOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<typeof superAdminFeatures[0] | null>(null);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Mock data for schedule and activities
  const todaySchedule = [
    { time: "09:00", title: "Inter-Hospital Coordination Meeting", description: "Monthly resource allocation review" },
    { time: "11:00", title: "Disease Surveillance Report Review", description: "Weekly outbreak risk assessment" },
    { time: "14:00", title: "Policy Implementation Meeting", description: "New bed allocation protocols" },
    { time: "16:00", title: "Hospital Performance Review", description: "Q3 performance metrics discussion" },
  ];
  
  const recentActivities = [
    { type: "alert" as const, message: "Outbreak alert issued for District B - Respiratory infections trending up", time: "10 min ago" },
    { type: "success" as const, message: "Emergency bed allocation approved for Metro Hospital", time: "35 min ago" },
    { type: "info" as const, message: "Monthly disease surveillance report generated", time: "1 hour ago" },
    { type: "warning" as const, message: "High occupancy alert: 3 hospitals above 90% capacity", time: "2 hours ago" },
    { type: "success" as const, message: "New hospital registration: Sunrise Medical Center", time: "4 hours ago" },
    { type: "info" as const, message: "Policy notice sent to all hospital administrators", time: "5 hours ago" },
  ];

  const handleFeatureClick = (feature: typeof superAdminFeatures[0]) => {
    setSelectedFeature(feature);
    setFeatureDialogOpen(true);
  };
  
  // Form state for new hospital
  const [newHospital, setNewHospital] = useState<HospitalCreateRequest>({
    name: "",
    city: "",
    icu_capacity: 10,
    hdu_capacity: 20,
    general_capacity: 50,
  });
  
  // Form state for notice
  const [notice, setNotice] = useState<AdminNoticeRequest>({
    title: "",
    message: "",
    severity: "info",
  });

  // Subscribe to real-time events
  useEffect(() => {
    const unsubBed = subscribe("bed.updated", () => {
      refetchBeds();
    });
    
    const unsubEmergency = subscribe("emergency.created", () => {
      refetchBeds();
    });
    
    return () => {
      unsubBed();
      unsubEmergency();
    };
  }, [subscribe, refetchBeds]);

  // Show outbreak alert based on risk level
  useEffect(() => {
    if (outbreakRisk?.risk_level === "high" || outbreakRisk?.risk_level === "moderate") {
      setShowOutbreakAlert(true);
    }
  }, [outbreakRisk]);

  // Loading state
  if (authLoading || (bedLoading && !bedSummary)) {
    return (
      <DashboardLayout
        role="super-admin"
        title="Government Health Dashboard"
        breadcrumbs={[{ label: "Dashboard", href: "/super-admin" }, { label: "Overview" }]}
        userName={user?.displayName || "Loading..."}
        userRole="Super Administrator"
      >
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  // Transform hospital data for map
  const hospitalMapData = bedSummary?.hospitals.map((h, index) => ({
    id: String(h.hospital_id),
    name: h.hospital_name,
    location: h.city,
    totalBeds: h.total_beds,
    availableBeds: h.total_available,
    occupiedBeds: h.total_occupied,
    status: h.status as "active" | "inactive" | "maintenance",
    lat: 28.6139 + (index * 0.05), // Mock coordinates
    lng: 77.2090 + (index * 0.03),
    contactNumber: "",
    emergencyCapacity: 0,
  })) || [];

  // Prepare ward usage data for bar chart
  const wardUsageData = bedSummary?.by_ward_type.map((w) => ({
    type: w.ward_type.toUpperCase(),
    occupied: w.total_occupied,
    available: w.total_available,
    total: w.total_capacity,
  })) || [];

  // Prepare severity distribution for pie chart
  const severityData = diseaseTrends?.emergency_by_severity.map((s) => ({
    name: s.severity,
    value: s.count,
  })) || [];

  // Hospital table columns
  const hospitalColumns = [
    { key: "hospital_name", header: "Hospital Name" },
    { key: "city", header: "City" },
    {
      key: "beds",
      header: "Bed Availability",
      render: (hospital: HospitalBedSummary) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-500"
              style={{
                width: `${hospital.total_beds > 0 
                  ? (hospital.total_available / hospital.total_beds) * 100 
                  : 0}%`,
              }}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {hospital.total_available}/{hospital.total_beds}
          </span>
        </div>
      ),
    },
    {
      key: "occupancy",
      header: "Occupancy",
      render: (hospital: HospitalBedSummary) => (
        <span className={`font-medium ${
          hospital.overall_occupancy_rate > 90 ? "text-red-500" :
          hospital.overall_occupancy_rate > 70 ? "text-yellow-500" :
          "text-green-500"
        }`}>
          {hospital.overall_occupancy_rate.toFixed(1)}%
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (hospital: HospitalBedSummary) => <StatusBadge status={hospital.status} />,
    },
  ];

  const handleCreateHospital = async () => {
    await createHospital.mutateAsync(newHospital);
    setIsAddHospitalOpen(false);
    setNewHospital({
      name: "",
      city: "",
      icu_capacity: 10,
      hdu_capacity: 20,
      general_capacity: 50,
    });
  };

  const handleSendNotice = async () => {
    await sendNotice.mutateAsync(notice);
    setIsSendNoticeOpen(false);
    setNotice({ title: "", message: "", severity: "info" });
  };

  return (
    <DashboardLayout
      role="super-admin"
      title="Government Health Dashboard"
      breadcrumbs={[
        { label: "Dashboard", href: "/super-admin" },
        { label: "Overview" },
      ]}
      userName={user?.displayName || "Super Admin"}
      userRole="Super Administrator"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <AlertBanner
            type="info"
            title="Connecting to Real-time Updates"
            message="Establishing connection to receive live updates from hospitals..."
          />
        )}

        {/* Outbreak Alert */}
        {showOutbreakAlert && outbreakRisk && outbreakRisk.risk_level !== "low" && (
          <AlertBanner
            type={outbreakRisk.risk_level === "high" ? "error" : "warning"}
            title={`Outbreak Risk: ${outbreakRisk.risk_level.toUpperCase()}`}
            message={outbreakRisk.recommendations.join(" ")}
            onDismiss={() => setShowOutbreakAlert(false)}
          />
        )}

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Hospitals"
            value={bedSummary?.total_hospitals || 0}
            subtitle={`${bedSummary?.active_hospitals || 0} active`}
            icon={Building2}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatsCard
            title="Total Emergencies"
            value={diseaseTrends?.total_emergencies || 0}
            subtitle={`${diseaseTrends?.avg_daily_emergencies?.toFixed(1) || 0}/day avg`}
            icon={AlertTriangle}
            iconColor="bg-gradient-to-br from-red-500 to-red-600"
            trend={{
              value: diseaseTrends?.trend_indicator === "INCREASING" ? 15 : 
                     diseaseTrends?.trend_indicator === "DECREASING" ? -10 : 0,
              isPositive: diseaseTrends?.trend_indicator === "DECREASING",
            }}
          />
          <StatsCard
            title="Available Beds"
            value={bedSummary?.total_available || 0}
            subtitle={`of ${bedSummary?.total_beds || 0} total beds`}
            icon={Bed}
            iconColor="bg-gradient-to-br from-cyan-500 to-cyan-600"
          />
          <StatsCard
            title="Occupancy Rate"
            value={`${bedSummary?.overall_occupancy_rate?.toFixed(1) || 0}%`}
            subtitle="District-wide average"
            icon={Activity}
            iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
          />
        </DashboardGrid>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Emergency Severity Distribution */}
          <AnimatedCard delay={0.1}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Emergency Severity Distribution</h3>
                <p className="text-sm text-muted-foreground">
                  Last {diseaseTrends?.period_days || 30} days
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => {}}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex h-[300px] items-center justify-center">
              {trendsLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={severityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${name ?? 'Unknown'}: ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {severityData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </AnimatedCard>

          {/* Ward Admissions */}
          <AnimatedCard delay={0.2}>
            <div className="mb-4">
              <h3 className="font-semibold">Ward Admissions</h3>
              <p className="text-sm text-muted-foreground">
                Active patients by ward type
              </p>
            </div>
            <div className="h-[300px]">
              {trendsLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={diseaseTrends?.admissions_by_ward.map((w) => ({
                      ward: w.ward_type.toUpperCase(),
                      active: w.active_patients,
                      admissions: w.admission_count,
                      discharges: w.discharge_count,
                    })) || []}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="ward" className="text-xs" />
                    <YAxis className="text-xs" />
                    <ChartTooltip />
                    <Bar dataKey="active" fill="hsl(var(--primary))" name="Active" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="admissions" fill="#10b981" name="Admissions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </AnimatedCard>
        </div>

        {/* Hospital Map */}
        <DashboardSection
          title="Hospital Network Map"
          description="Click on a hospital to view details"
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetchBeds()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          }
        >
          <HospitalMap
            hospitals={hospitalMapData}
            selectedHospitalId={selectedHospital ? String(selectedHospital.hospital_id) : undefined}
            onHospitalSelect={(h) => {
              const found = bedSummary?.hospitals.find(
                (hp) => hp.hospital_id === parseInt(h.id, 10)
              );
              setSelectedHospital(found || null);
            }}
          />
        </DashboardSection>

        {/* Bed Usage by Ward Type */}
        <AnimatedCard delay={0.3}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Bed Usage by Ward Type</h3>
              <p className="text-sm text-muted-foreground">District-wide occupancy</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-primary" />
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-muted" />
                <span>Available</span>
              </div>
            </div>
          </div>
          <div className="h-[250px]">
            {bedLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardUsageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="type" type="category" className="text-xs" width={80} />
                  <ChartTooltip />
                  <Bar dataKey="occupied" fill="hsl(var(--primary))" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="available" fill="hsl(var(--muted))" stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </AnimatedCard>

        {/* Hospital Management Table */}
        <DashboardSection
          title="Hospital Management"
          description="Manage hospitals across all regions"
          action={
            <div className="flex gap-2">
              {/* Send Notice Dialog */}
              <Dialog open={isSendNoticeOpen} onOpenChange={setIsSendNoticeOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Send className="mr-2 h-4 w-4" />
                    Send Notice
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send Notice to Hospitals</DialogTitle>
                    <DialogDescription>
                      Broadcast a notice to all hospital administrators
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="notice-title">Title</Label>
                      <Input
                        id="notice-title"
                        value={notice.title}
                        onChange={(e) => setNotice({ ...notice, title: e.target.value })}
                        placeholder="Notice title..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notice-message">Message</Label>
                      <Textarea
                        id="notice-message"
                        value={notice.message}
                        onChange={(e) => setNotice({ ...notice, message: e.target.value })}
                        placeholder="Notice content..."
                        rows={4}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="notice-severity">Severity</Label>
                      <Select
                        value={notice.severity}
                        onValueChange={(v) => setNotice({ ...notice, severity: v as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSendNoticeOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSendNotice}
                      disabled={!notice.title || !notice.message || sendNotice.isPending}
                    >
                      {sendNotice.isPending ? "Sending..." : "Send Notice"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Add Hospital Dialog */}
              <Dialog open={isAddHospitalOpen} onOpenChange={setIsAddHospitalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Hospital
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Hospital</DialogTitle>
                    <DialogDescription>
                      Register a new hospital in the district
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Hospital Name</Label>
                      <Input
                        id="name"
                        value={newHospital.name}
                        onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                        placeholder="Enter hospital name..."
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={newHospital.city}
                        onChange={(e) => setNewHospital({ ...newHospital, city: e.target.value })}
                        placeholder="Enter city..."
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="icu">ICU Beds</Label>
                        <Input
                          id="icu"
                          type="number"
                          value={newHospital.icu_capacity}
                          onChange={(e) =>
                            setNewHospital({ ...newHospital, icu_capacity: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hdu">HDU Beds</Label>
                        <Input
                          id="hdu"
                          type="number"
                          value={newHospital.hdu_capacity}
                          onChange={(e) =>
                            setNewHospital({ ...newHospital, hdu_capacity: parseInt(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="general">General Beds</Label>
                        <Input
                          id="general"
                          type="number"
                          value={newHospital.general_capacity}
                          onChange={(e) =>
                            setNewHospital({
                              ...newHospital,
                              general_capacity: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddHospitalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateHospital}
                      disabled={!newHospital.name || !newHospital.city || createHospital.isPending}
                    >
                      {createHospital.isPending ? "Creating..." : "Create Hospital"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          }
        >
          {bedLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <DataTable
              data={(bedSummary?.hospitals || []).map(h => ({ ...h, id: h.hospital_id }))}
              columns={hospitalColumns}
              onRowClick={(hospital) => setSelectedHospital(hospital as HospitalBedSummary)}
            />
          )}
        </DashboardSection>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <FeaturesGrid
              features={superAdminFeatures}
              onFeatureClick={handleFeatureClick}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Summary Metrics */}
            <DashboardGrid cols={4}>
              <MetricCard
                label="Active Hospitals"
                value={bedSummary?.active_hospitals || 0}
                subValue={`of ${bedSummary?.total_hospitals || 0} registered`}
                trend={{ value: 12, isPositive: true }}
              />
              <MetricCard
                label="District Occupancy"
                value={`${bedSummary?.overall_occupancy_rate?.toFixed(1) || 0}%`}
                subValue="Average across all hospitals"
                trend={{ 
                  value: bedSummary?.overall_occupancy_rate && bedSummary.overall_occupancy_rate > 80 ? 5 : -3, 
                  isPositive: bedSummary?.overall_occupancy_rate ? bedSummary.overall_occupancy_rate < 80 : true 
                }}
              />
              <MetricCard
                label="Total Emergencies"
                value={diseaseTrends?.total_emergencies || 0}
                subValue={`${diseaseTrends?.avg_daily_emergencies?.toFixed(0) || 0} daily average`}
                trend={{ 
                  value: diseaseTrends?.trend_indicator === "INCREASING" ? 15 : -10, 
                  isPositive: diseaseTrends?.trend_indicator === "DECREASING" 
                }}
              />
              <MetricCard
                label="Critical Beds Available"
                value={bedSummary?.by_ward_type.find(w => w.ward_type === "icu")?.total_available || 0}
                subValue="ICU capacity remaining"
              />
            </DashboardGrid>

            {/* Status Overview Cards */}
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0.1}>
                <div className="mb-4">
                  <h3 className="font-semibold">Hospital Status Distribution</h3>
                  <p className="text-sm text-muted-foreground">Operational status breakdown</p>
                </div>
                <StatusOverview
                  items={[
                    { 
                      label: "Critical (>90%)", 
                      value: bedSummary?.hospitals.filter(h => h.overall_occupancy_rate > 90).length || 0,
                      color: "bg-red-500" 
                    },
                    { 
                      label: "High (70-90%)", 
                      value: bedSummary?.hospitals.filter(h => h.overall_occupancy_rate >= 70 && h.overall_occupancy_rate <= 90).length || 0,
                      color: "bg-yellow-500" 
                    },
                    { 
                      label: "Normal (<70%)", 
                      value: bedSummary?.hospitals.filter(h => h.overall_occupancy_rate < 70).length || 0,
                      color: "bg-green-500" 
                    },
                    { 
                      label: "Inactive", 
                      value: (bedSummary?.total_hospitals || 0) - (bedSummary?.active_hospitals || 0),
                      color: "bg-gray-500" 
                    },
                  ]}
                />
              </AnimatedCard>

              <AnimatedCard delay={0.2}>
                <div className="mb-4">
                  <h3 className="font-semibold">Emergency Severity Breakdown</h3>
                  <p className="text-sm text-muted-foreground">Current distribution</p>
                </div>
                <StatusOverview
                  items={diseaseTrends?.emergency_by_severity.map((s, index) => ({
                    label: s.severity,
                    value: s.count,
                    color: pieColors[index % pieColors.length],
                  })) || []}
                />
              </AnimatedCard>
            </div>

            {/* Detailed Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <AnimatedCard delay={0.3}>
                <div className="mb-4">
                  <h3 className="font-semibold">Disease Trends</h3>
                  <p className="text-sm text-muted-foreground">Top conditions reported</p>
                </div>
                <div className="space-y-3">
                  {diseaseTrends?.top_conditions.slice(0, 5).map((condition, index) => (
                    <div key={condition.condition} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm">{condition.condition}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="h-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${(condition.count / (diseaseTrends?.top_conditions[0]?.count || 1)) * 100}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                          />
                        </div>
                        <span className="text-sm font-medium">{condition.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedCard>

              <AnimatedCard delay={0.4}>
                <div className="mb-4">
                  <h3 className="font-semibold">Bed Capacity by Type</h3>
                  <p className="text-sm text-muted-foreground">District-wide capacity</p>
                </div>
                <div className="space-y-4">
                  {wardUsageData.map((ward, index) => (
                    <div key={ward.type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{ward.type}</span>
                        <span className="text-muted-foreground">
                          {ward.occupied}/{ward.total} ({((ward.occupied / ward.total) * 100).toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={`h-full ${
                            (ward.occupied / ward.total) > 0.9 ? 'bg-red-500' :
                            (ward.occupied / ward.total) > 0.7 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(ward.occupied / ward.total) * 100}%` }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AnimatedCard>
            </div>

            {/* Regional Analysis */}
            <AnimatedCard delay={0.5}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Regional Hospital Performance</h3>
                  <p className="text-sm text-muted-foreground">Comparative analysis by city</p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
              <div className="space-y-3">
                {/* Group hospitals by city */}
                {Array.from(new Set(bedSummary?.hospitals.map(h => h.city) || [])).slice(0, 5).map((city, index) => {
                  const cityHospitals = bedSummary?.hospitals.filter(h => h.city === city) || [];
                  const avgOccupancy = cityHospitals.length > 0 
                    ? cityHospitals.reduce((sum, h) => sum + h.overall_occupancy_rate, 0) / cityHospitals.length 
                    : 0;
                  const totalBeds = cityHospitals.reduce((sum, h) => sum + h.total_beds, 0);
                  
                  return (
                    <motion.div
                      key={city}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{city}</p>
                          <p className="text-xs text-muted-foreground">{cityHospitals.length} hospitals · {totalBeds} beds</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          avgOccupancy > 90 ? 'text-red-500' :
                          avgOccupancy > 70 ? 'text-yellow-500' :
                          'text-green-500'
                        }`}>
                          {avgOccupancy.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">avg occupancy</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatedCard>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Today's Schedule */}
              <AnimatedCard delay={0.1} className="lg:col-span-1">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Today's Schedule</h3>
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
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
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

            {/* Quick Actions */}
            <AnimatedCard delay={0.3}>
              <div className="mb-4">
                <h3 className="font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground">Frequently used administrative actions</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setIsSendNoticeOpen(true)}>
                  <Send className="h-5 w-5" />
                  <span>Send Notice</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4" onClick={() => setIsAddHospitalOpen(true)}>
                  <Plus className="h-5 w-5" />
                  <span>Add Hospital</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <FileText className="h-5 w-5" />
                  <span>Generate Report</span>
                </Button>
                <Button variant="outline" className="h-auto flex-col gap-2 p-4">
                  <Zap className="h-5 w-5" />
                  <span>Emergency Protocol</span>
                </Button>
              </div>
            </AnimatedCard>

            {/* System Status */}
            <AnimatedCard delay={0.4}>
              <div className="mb-4">
                <h3 className="font-semibold">System Status</h3>
                <p className="text-sm text-muted-foreground">Real-time system health monitoring</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-sm font-medium">WebSocket</p>
                    <p className="text-xs text-muted-foreground">{isConnected ? 'Connected' : 'Disconnected'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">API Server</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Database</p>
                    <p className="text-xs text-muted-foreground">Healthy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Notifications</p>
                    <p className="text-xs text-muted-foreground">Queue: 3 pending</p>
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
