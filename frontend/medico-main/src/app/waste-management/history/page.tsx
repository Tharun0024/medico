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
  History,
  Search,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  Truck,
  Building,
  Scale,
  Biohazard,
  AlertTriangle,
  Package,
  Recycle,
  Eye,
  FileText,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// Mock collection history
const collectionHistory = [
  {
    id: "COL001",
    hospital: "City General Hospital",
    wasteType: "Infectious",
    weight: "45.2 kg",
    date: "2024-01-17",
    time: "10:30 AM",
    driver: "Ramesh Kumar",
    vehicle: "MH-01-AB-1234",
    status: "completed",
    processingFacility: "Central Waste Treatment",
  },
  {
    id: "COL002",
    hospital: "Apollo Hospital",
    wasteType: "Hazardous",
    weight: "12.8 kg",
    date: "2024-01-17",
    time: "11:45 AM",
    driver: "Suresh Patel",
    vehicle: "MH-01-CD-5678",
    status: "completed",
    processingFacility: "Hazardous Waste Facility",
  },
  {
    id: "COL003",
    hospital: "Fortis Hospital",
    wasteType: "General",
    weight: "78.5 kg",
    date: "2024-01-17",
    time: "01:15 PM",
    driver: "Ramesh Kumar",
    vehicle: "MH-01-AB-1234",
    status: "completed",
    processingFacility: "Municipal Processing Center",
  },
  {
    id: "COL004",
    hospital: "Lilavati Hospital",
    wasteType: "Recyclable",
    weight: "23.1 kg",
    date: "2024-01-16",
    time: "09:00 AM",
    driver: "Amit Singh",
    vehicle: "MH-01-EF-9012",
    status: "completed",
    processingFacility: "Recycling Center",
  },
  {
    id: "COL005",
    hospital: "Hinduja Hospital",
    wasteType: "Infectious",
    weight: "32.4 kg",
    date: "2024-01-16",
    time: "10:30 AM",
    driver: "Ramesh Kumar",
    vehicle: "MH-01-AB-1234",
    status: "completed",
    processingFacility: "Central Waste Treatment",
  },
  {
    id: "COL006",
    hospital: "Kokilaben Hospital",
    wasteType: "General",
    weight: "56.7 kg",
    date: "2024-01-16",
    time: "02:00 PM",
    driver: "Suresh Patel",
    vehicle: "MH-01-CD-5678",
    status: "completed",
    processingFacility: "Municipal Processing Center",
  },
  {
    id: "COL007",
    hospital: "City General Hospital",
    wasteType: "Hazardous",
    weight: "8.9 kg",
    date: "2024-01-15",
    time: "11:00 AM",
    driver: "Amit Singh",
    vehicle: "MH-01-EF-9012",
    status: "completed",
    processingFacility: "Hazardous Waste Facility",
  },
  {
    id: "COL008",
    hospital: "Apollo Hospital",
    wasteType: "Recyclable",
    weight: "34.2 kg",
    date: "2024-01-15",
    time: "03:30 PM",
    driver: "Ramesh Kumar",
    vehicle: "MH-01-AB-1234",
    status: "completed",
    processingFacility: "Recycling Center",
  },
];

// Weekly trend data
const weeklyTrend = [
  { day: "Mon", collections: 12, weight: 245 },
  { day: "Tue", collections: 15, weight: 312 },
  { day: "Wed", collections: 11, weight: 198 },
  { day: "Thu", collections: 18, weight: 387 },
  { day: "Fri", collections: 14, weight: 276 },
  { day: "Sat", collections: 8, weight: 156 },
  { day: "Sun", collections: 5, weight: 98 },
];

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

export default function CollectionHistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [dateRange, setDateRange] = useState("7");
  const [selectedCollection, setSelectedCollection] = useState<typeof collectionHistory[0] | null>(null);

  const filteredHistory = collectionHistory.filter((item) => {
    const matchesSearch =
      item.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || item.wasteType.toLowerCase() === selectedType;
    return matchesSearch && matchesType;
  });

  const totalWeight = collectionHistory.reduce((sum, item) => sum + parseFloat(item.weight), 0);

  const stats = {
    totalCollections: collectionHistory.length,
    totalWeight: totalWeight.toFixed(1),
    hospitalsServed: new Set(collectionHistory.map((c) => c.hospital)).size,
    avgPerDay: (collectionHistory.length / 7).toFixed(1),
  };

  const handleExport = () => {
    toast.success("Report exported successfully");
  };

  return (
    <DashboardLayout
      role="waste-management"
      title="Collection History"
      breadcrumbs={[
        { label: "Dashboard", href: "/waste-management" },
        { label: "Collection History" },
      ]}
      userName="Waste Operator"
      userRole="Waste Collection Team"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Collections"
            value={stats.totalCollections}
            icon={Truck}
            subtitle="This week"
          />
          <StatsCard
            title="Total Weight"
            value={`${stats.totalWeight} kg`}
            icon={Scale}
            subtitle="Collected this week"
          />
          <StatsCard
            title="Hospitals Served"
            value={stats.hospitalsServed}
            icon={Building}
            subtitle="Active facilities"
          />
          <StatsCard
            title="Avg. Per Day"
            value={stats.avgPerDay}
            icon={Calendar}
            subtitle="Collections"
          />
        </DashboardGrid>

        {/* Weekly Trend Chart */}
        <AnimatedCard>
          <h3 className="text-lg font-semibold mb-4">Weekly Collection Trend</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="collections"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                  name="Collections"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="weight"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e" }}
                  name="Weight (kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>

        {/* Filters */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Waste type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="infectious">Infectious</SelectItem>
                  <SelectItem value="hazardous">Hazardous</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="recyclable">Recyclable</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </AnimatedCard>

        {/* History Table */}
        <AnimatedCard delay={0.1}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collection ID</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Waste Type</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TableCell className="font-mono text-sm">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.hospital}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(item.wasteType)}
                      <span>{item.wasteType}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.weight}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{item.date}</p>
                      <p className="text-muted-foreground">{item.time}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.driver}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedCollection(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Collection Details - {item.id}</DialogTitle>
                          <DialogDescription>Complete collection information</DialogDescription>
                        </DialogHeader>
                        {selectedCollection && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Hospital</p>
                                <p className="font-medium">{selectedCollection.hospital}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Date & Time</p>
                                <p className="font-medium">
                                  {selectedCollection.date} {selectedCollection.time}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Waste Type</p>
                                <div className="flex items-center gap-2">
                                  {getTypeIcon(selectedCollection.wasteType)}
                                  <span className="font-medium">{selectedCollection.wasteType}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Weight</p>
                                <p className="font-medium">{selectedCollection.weight}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Driver</p>
                                <p className="font-medium">{selectedCollection.driver}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Vehicle</p>
                                <p className="font-medium">{selectedCollection.vehicle}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Processing Facility</p>
                              <p className="font-medium">{selectedCollection.processingFacility}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-5 w-5 text-green-500" />
                              <span className="font-medium text-green-600">Collection Completed</span>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="sm">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
