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
  Activity,
  AlertTriangle,
  MapPin,
  TrendingUp,
  TrendingDown,
  Shield,
  Thermometer,
  Users,
  Calendar,
  Bell,
  Download,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart";

// Mock outbreak data
const outbreaks = [
  { id: 1, disease: "Dengue", region: "Delhi NCR", cases: 234, trend: "increasing", severity: "high", startDate: "2024-01-15" },
  { id: 2, disease: "Malaria", region: "Mumbai", cases: 156, trend: "stable", severity: "medium", startDate: "2024-01-20" },
  { id: 3, disease: "COVID-19", region: "Bangalore", cases: 89, trend: "decreasing", severity: "low", startDate: "2024-01-10" },
  { id: 4, disease: "Cholera", region: "Chennai", cases: 45, trend: "increasing", severity: "high", startDate: "2024-01-25" },
  { id: 5, disease: "Typhoid", region: "Hyderabad", cases: 67, trend: "stable", severity: "medium", startDate: "2024-01-18" },
];

const trendData = [
  { date: "Jan 1", dengue: 45, malaria: 30, covid: 120, cholera: 10 },
  { date: "Jan 8", dengue: 78, malaria: 35, covid: 95, cholera: 15 },
  { date: "Jan 15", dengue: 120, malaria: 42, covid: 80, cholera: 22 },
  { date: "Jan 22", dengue: 180, malaria: 55, covid: 65, cholera: 35 },
  { date: "Jan 29", dengue: 234, malaria: 48, covid: 55, cholera: 45 },
  { date: "Feb 5", dengue: 210, malaria: 52, covid: 48, cholera: 40 },
];

const regionData = [
  { region: "Delhi NCR", activeCases: 324, hospitals: 45, beds: 1200 },
  { region: "Mumbai", activeCases: 256, hospitals: 38, beds: 980 },
  { region: "Bangalore", activeCases: 145, hospitals: 32, beds: 850 },
  { region: "Chennai", activeCases: 198, hospitals: 28, beds: 720 },
  { region: "Hyderabad", activeCases: 167, hospitals: 25, beds: 680 },
];

export default function OutbreaksPage() {
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [timeRange, setTimeRange] = useState("30d");

  const totalCases = outbreaks.reduce((sum, o) => sum + o.cases, 0);
  const highSeverity = outbreaks.filter((o) => o.severity === "high").length;
  const increasing = outbreaks.filter((o) => o.trend === "increasing").length;

  return (
    <DashboardLayout
      role="super-admin"
      title="Outbreak Monitor"
      breadcrumbs={[
        { label: "Dashboard", href: "/super-admin" },
        { label: "Outbreak Monitor" },
      ]}
      userName="Super Admin"
      userRole="Government Administrator"
    >
      <div className="space-y-6">
        {/* Alert Banner */}
        {highSeverity > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 dark:text-red-200">Active High-Severity Outbreaks</h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                {highSeverity} outbreak(s) require immediate attention. {increasing} showing increasing trends.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Bell className="mr-2 h-4 w-4" />
              Send Alert
            </Button>
          </motion.div>
        )}

        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Active Outbreaks"
            value={outbreaks.length}
            subtitle="Currently monitoring"
            icon={Activity}
            iconColor="bg-gradient-to-br from-red-500 to-red-600"
          />
          <StatsCard
            title="Total Cases"
            value={totalCases.toLocaleString()}
            subtitle="Across all outbreaks"
            icon={Users}
            iconColor="bg-gradient-to-br from-orange-500 to-orange-600"
            trend={{ value: 12, isPositive: false }}
          />
          <StatsCard
            title="High Severity"
            value={highSeverity}
            subtitle="Require immediate action"
            icon={AlertTriangle}
            iconColor="bg-gradient-to-br from-yellow-500 to-yellow-600"
          />
          <StatsCard
            title="Regions Affected"
            value={regionData.length}
            subtitle="Active monitoring zones"
            icon={MapPin}
            iconColor="bg-gradient-to-br from-blue-500 to-blue-600"
          />
        </DashboardGrid>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trend Chart */}
          <AnimatedCard delay={0.1}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Disease Trends</h3>
                <p className="text-sm text-muted-foreground">Case progression over time</p>
              </div>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <ChartTooltip />
                  <Area type="monotone" dataKey="dengue" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Dengue" />
                  <Area type="monotone" dataKey="malaria" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="Malaria" />
                  <Area type="monotone" dataKey="covid" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="COVID-19" />
                  <Area type="monotone" dataKey="cholera" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Cholera" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>

          {/* Regional Distribution */}
          <AnimatedCard delay={0.2}>
            <div className="mb-4">
              <h3 className="font-semibold">Regional Distribution</h3>
              <p className="text-sm text-muted-foreground">Cases by region</p>
            </div>
            <div className="space-y-4">
              {regionData.map((region, index) => (
                <motion.div
                  key={region.region}
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
                      <p className="font-medium">{region.region}</p>
                      <p className="text-xs text-muted-foreground">{region.hospitals} hospitals · {region.beds} beds</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{region.activeCases}</p>
                    <p className="text-xs text-muted-foreground">active cases</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatedCard>
        </div>

        {/* Active Outbreaks List */}
        <DashboardSection
          title="Active Outbreaks"
          description="Monitor and manage current disease outbreaks"
          action={
            <div className="flex gap-2">
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regionData.map((r) => (
                    <SelectItem key={r.region} value={r.region}>{r.region}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {outbreaks.map((outbreak, index) => (
              <motion.div
                key={outbreak.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between rounded-xl border p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    outbreak.severity === "high" ? "bg-red-100 dark:bg-red-950" :
                    outbreak.severity === "medium" ? "bg-yellow-100 dark:bg-yellow-950" :
                    "bg-green-100 dark:bg-green-950"
                  }`}>
                    <Thermometer className={`h-6 w-6 ${
                      outbreak.severity === "high" ? "text-red-600 dark:text-red-400" :
                      outbreak.severity === "medium" ? "text-yellow-600 dark:text-yellow-400" :
                      "text-green-600 dark:text-green-400"
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{outbreak.disease}</h4>
                      <Badge variant={
                        outbreak.severity === "high" ? "destructive" :
                        outbreak.severity === "medium" ? "secondary" : "default"
                      }>
                        {outbreak.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {outbreak.region}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Started {outbreak.startDate}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold">{outbreak.cases}</p>
                    <p className="text-xs text-muted-foreground">reported cases</p>
                  </div>
                  <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                    outbreak.trend === "increasing" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" :
                    outbreak.trend === "decreasing" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                  }`}>
                    {outbreak.trend === "increasing" ? <TrendingUp className="h-4 w-4" /> :
                     outbreak.trend === "decreasing" ? <TrendingDown className="h-4 w-4" /> :
                     <Activity className="h-4 w-4" />}
                    {outbreak.trend}
                  </div>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </DashboardSection>
      </div>
    </DashboardLayout>
  );
}
