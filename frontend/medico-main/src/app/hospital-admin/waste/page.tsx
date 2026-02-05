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
  Recycle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  Biohazard,
  Droplets,
  Package,
  Scale,
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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// Mock waste data
const wasteOverTime = [
  { date: "Jan 1", infectious: 45, hazardous: 12, general: 78, recyclable: 23 },
  { date: "Jan 5", infectious: 52, hazardous: 15, general: 82, recyclable: 28 },
  { date: "Jan 10", infectious: 48, hazardous: 18, general: 75, recyclable: 25 },
  { date: "Jan 15", infectious: 61, hazardous: 14, general: 88, recyclable: 32 },
  { date: "Jan 20", infectious: 55, hazardous: 16, general: 79, recyclable: 29 },
  { date: "Jan 25", infectious: 58, hazardous: 13, general: 85, recyclable: 31 },
  { date: "Jan 30", infectious: 63, hazardous: 17, general: 92, recyclable: 35 },
];

const wasteByCategory = [
  { name: "Infectious", value: 382, color: "#ef4444" },
  { name: "Hazardous", value: 105, color: "#f97316" },
  { name: "General", value: 579, color: "#3b82f6" },
  { name: "Recyclable", value: 203, color: "#22c55e" },
];

const wardWaste = [
  { ward: "ICU", infectious: 85, hazardous: 32, general: 45 },
  { ward: "Emergency", infectious: 72, hazardous: 28, general: 56 },
  { ward: "General", infectious: 45, hazardous: 12, general: 120 },
  { ward: "Surgery", infectious: 95, hazardous: 25, general: 38 },
  { ward: "Pediatric", infectious: 28, hazardous: 5, general: 42 },
  { ward: "Maternity", infectious: 35, hazardous: 8, general: 65 },
];

const recentCollections = [
  { id: "WC001", type: "Infectious", weight: "45 kg", date: "2024-01-17", status: "completed" },
  { id: "WC002", type: "Hazardous", weight: "12 kg", date: "2024-01-17", status: "in-transit" },
  { id: "WC003", type: "General", weight: "78 kg", date: "2024-01-17", status: "pending" },
  { id: "WC004", type: "Recyclable", weight: "23 kg", date: "2024-01-16", status: "completed" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "default";
    case "in-transit":
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

export default function WasteAnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30");

  const totalWaste = wasteByCategory.reduce((sum, cat) => sum + cat.value, 0);

  return (
    <DashboardLayout
      role="hospital-admin"
      title="Waste Analytics"
      breadcrumbs={[
        { label: "Dashboard", href: "/hospital-admin" },
        { label: "Waste Analytics" },
      ]}
      userName="Hospital Admin"
      userRole="City General Hospital"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Waste"
            value={`${totalWaste} kg`}
            icon={Scale}
            subtitle="This month"
          />
          <StatsCard
            title="Infectious Waste"
            value="382 kg"
            icon={Biohazard}
            trend={{ value: 12, isPositive: false }}
            className="border-red-200 dark:border-red-900"
          />
          <StatsCard
            title="Hazardous Waste"
            value="105 kg"
            icon={AlertTriangle}
            trend={{ value: 5, isPositive: true }}
            className="border-orange-200 dark:border-orange-900"
          />
          <StatsCard
            title="Recycled"
            value="203 kg"
            icon={Recycle}
            subtitle="16% of total waste"
            className="border-green-200 dark:border-green-900"
          />
        </DashboardGrid>

        {/* Filter */}
        <AnimatedCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </AnimatedCard>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Waste Over Time */}
          <AnimatedCard delay={0.1}>
            <h3 className="text-lg font-semibold mb-4">Waste Generation Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={wasteOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="general"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="General"
                  />
                  <Area
                    type="monotone"
                    dataKey="infectious"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.6}
                    name="Infectious"
                  />
                  <Area
                    type="monotone"
                    dataKey="hazardous"
                    stackId="1"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.6}
                    name="Hazardous"
                  />
                  <Area
                    type="monotone"
                    dataKey="recyclable"
                    stackId="1"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.6}
                    name="Recyclable"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>

          {/* Waste Distribution */}
          <AnimatedCard delay={0.2}>
            <h3 className="text-lg font-semibold mb-4">Waste Distribution</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={wasteByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {wasteByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} kg`, "Weight"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Ward-wise Waste */}
          <AnimatedCard delay={0.3}>
            <h3 className="text-lg font-semibold mb-4">Waste by Ward</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wardWaste} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="ward" type="category" className="text-xs" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="infectious" name="Infectious" fill="#ef4444" stackId="a" />
                  <Bar dataKey="hazardous" name="Hazardous" fill="#f97316" stackId="a" />
                  <Bar dataKey="general" name="General" fill="#3b82f6" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </AnimatedCard>

          {/* Recent Collections */}
          <AnimatedCard delay={0.4}>
            <h3 className="text-lg font-semibold mb-4">Recent Collections</h3>
            <div className="space-y-3">
              {recentCollections.map((collection, index) => (
                <motion.div
                  key={collection.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {getTypeIcon(collection.type)}
                    </div>
                    <div>
                      <p className="font-medium">{collection.type} Waste</p>
                      <p className="text-sm text-muted-foreground">
                        {collection.weight} • {collection.date}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusColor(collection.status)}>{collection.status}</Badge>
                </motion.div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Collections
            </Button>
          </AnimatedCard>
        </div>
      </div>
    </DashboardLayout>
  );
}
