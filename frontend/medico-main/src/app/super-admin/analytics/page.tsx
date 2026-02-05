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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Bed,
  Activity,
  Download,
  Calendar,
  Filter,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart";

// Mock data
const admissionsTrend = [
  { month: "Jan", admissions: 1250, discharges: 1180, emergencies: 320 },
  { month: "Feb", admissions: 1380, discharges: 1290, emergencies: 380 },
  { month: "Mar", admissions: 1420, discharges: 1350, emergencies: 350 },
  { month: "Apr", admissions: 1280, discharges: 1220, emergencies: 290 },
  { month: "May", admissions: 1520, discharges: 1450, emergencies: 420 },
  { month: "Jun", admissions: 1680, discharges: 1580, emergencies: 480 },
];

const bedUtilization = [
  { type: "ICU", utilized: 85, available: 15 },
  { type: "HDU", utilized: 72, available: 28 },
  { type: "General", utilized: 68, available: 32 },
  { type: "Pediatric", utilized: 55, available: 45 },
  { type: "Maternity", utilized: 78, available: 22 },
];

const diseaseDistribution = [
  { name: "Cardiac", value: 28 },
  { name: "Respiratory", value: 22 },
  { name: "Orthopedic", value: 18 },
  { name: "Neurological", value: 15 },
  { name: "Others", value: 17 },
];

const hospitalPerformance = [
  { hospital: "City General", score: 92, patients: 1250, satisfaction: 4.5 },
  { hospital: "Metro Medical", score: 88, patients: 980, satisfaction: 4.3 },
  { hospital: "Green Valley", score: 95, patients: 850, satisfaction: 4.7 },
  { hospital: "Sunrise", score: 78, patients: 720, satisfaction: 4.0 },
  { hospital: "Apollo", score: 91, patients: 1100, satisfaction: 4.6 },
];

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("6m");
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <DashboardLayout
      role="super-admin"
      title="Analytics & Reports"
      breadcrumbs={[
        { label: "Dashboard", href: "/super-admin" },
        { label: "Analytics" },
      ]}
      userName="Super Admin"
      userRole="Government Administrator"
    >
      <div className="space-y-6">
        {/* Stats Overview */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Admissions"
            value="8,530"
            subtitle="This quarter"
            icon={Users}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatsCard
            title="Bed Utilization"
            value="74.5%"
            subtitle="Average across all"
            icon={Bed}
            iconColor="bg-gradient-to-br from-cyan-500 to-cyan-600"
            trend={{ value: 3.2, isPositive: false }}
          />
          <StatsCard
            title="Emergency Cases"
            value="2,240"
            subtitle="This quarter"
            icon={Activity}
            iconColor="bg-gradient-to-br from-red-500 to-red-600"
            trend={{ value: 8.7, isPositive: false }}
          />
          <StatsCard
            title="Avg. Stay Duration"
            value="4.2 days"
            subtitle="Per patient"
            icon={Calendar}
            iconColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
            trend={{ value: 5.1, isPositive: true }}
          />
        </DashboardGrid>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
              <TabsTrigger value="diseases">Diseases</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">Last Month</SelectItem>
                <SelectItem value="3m">3 Months</SelectItem>
                <SelectItem value="6m">6 Months</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Admissions Trend */}
          <AnimatedCard delay={0.1}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Admissions & Discharges</h3>
                <p className="text-sm text-muted-foreground">Monthly trend analysis</p>
              </div>
              <LineChartIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={admissionsTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="admissions" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Admissions" />
                  <Area type="monotone" dataKey="discharges" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="Discharges" />
                  <Area type="monotone" dataKey="emergencies" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Emergencies" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>

          {/* Disease Distribution */}
          <AnimatedCard delay={0.2}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Disease Distribution</h3>
                <p className="text-sm text-muted-foreground">Cases by category</p>
              </div>
              <PieChartIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={diseaseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {diseaseDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>

          {/* Bed Utilization */}
          <AnimatedCard delay={0.3}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Bed Utilization by Type</h3>
                <p className="text-sm text-muted-foreground">Current occupancy rates</p>
              </div>
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bedUtilization} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} className="text-xs" />
                  <YAxis dataKey="type" type="category" className="text-xs" width={80} />
                  <ChartTooltip />
                  <Bar dataKey="utilized" fill="#3b82f6" name="Utilized" stackId="a" />
                  <Bar dataKey="available" fill="#e5e7eb" name="Available" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>

          {/* Hospital Performance */}
          <AnimatedCard delay={0.4}>
            <div className="mb-4">
              <h3 className="font-semibold">Hospital Performance</h3>
              <p className="text-sm text-muted-foreground">Top performing facilities</p>
            </div>
            <div className="space-y-4">
              {hospitalPerformance.map((hospital, index) => (
                <motion.div
                  key={hospital.hospital}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium">{hospital.hospital}</p>
                      <p className="text-xs text-muted-foreground">{hospital.patients} patients</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{hospital.score}%</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-500">
                      {"★".repeat(Math.floor(hospital.satisfaction))}
                      <span className="text-sm ml-1">{hospital.satisfaction}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <AnimatedCard delay={0.5}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-100 dark:bg-green-950">
                <TrendingUp className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">+15.3%</p>
                <p className="text-sm text-muted-foreground">Recovery Rate Improvement</p>
              </div>
            </div>
          </AnimatedCard>
          <AnimatedCard delay={0.6}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950">
                <Users className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">45,280</p>
                <p className="text-sm text-muted-foreground">Patients Treated (YTD)</p>
              </div>
            </div>
          </AnimatedCard>
          <AnimatedCard delay={0.7}>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950">
                <Activity className="h-7 w-7 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">98.5%</p>
                <p className="text-sm text-muted-foreground">System Uptime</p>
              </div>
            </div>
          </AnimatedCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
