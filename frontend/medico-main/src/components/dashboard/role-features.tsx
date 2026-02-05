"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  DashboardGrid,
  AnimatedCard,
  FeatureCard,
  MetricCard,
  ActivityItem,
  StatusOverview,
  ScheduleItem,
  CompactStat,
} from "@/components/dashboard";
import {
  Bed,
  Users,
  AlertTriangle,
  FileText,
  Calendar,
  Settings,
  BarChart3,
  Bell,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
  Activity,
  Stethoscope,
  Building2,
  Trash2,
  Shield,
  MapPin,
  Heart,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Hospital Admin Features Configuration
export const hospitalAdminFeatures = [
  {
    id: "bed-management",
    title: "Bed Management",
    description: "Manage bed allocation, availability, and ward assignments",
    icon: Bed,
    iconColor: "bg-gradient-to-br from-blue-500 to-blue-600",
    badge: "Core",
    subFeatures: [
      "Real-time bed availability tracking",
      "Ward-wise capacity management",
      "Bed allocation & transfer",
      "Cleaning status tracking",
      "Reservation system",
    ],
  },
  {
    id: "patient-oversight",
    title: "Patient Overview",
    description: "Monitor all patients across wards with real-time updates",
    icon: Users,
    iconColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    badge: "Essential",
    subFeatures: [
      "Patient admission tracking",
      "Discharge management",
      "Ward transfer monitoring",
      "Critical patient alerts",
      "Length of stay analytics",
    ],
  },
  {
    id: "waste-management",
    title: "Waste Management",
    description: "AI-powered medical waste prediction and pickup scheduling",
    icon: Trash2,
    iconColor: "bg-gradient-to-br from-orange-500 to-orange-600",
    badge: "AI",
    subFeatures: [
      "Daily waste prediction",
      "Pickup request management",
      "Waste type categorization",
      "Compliance tracking",
      "Cost optimization",
    ],
  },
  {
    id: "staff-scheduling",
    title: "Staff Management",
    description: "Manage staff schedules, shifts, and department assignments",
    icon: Calendar,
    iconColor: "bg-gradient-to-br from-violet-500 to-violet-600",
    subFeatures: [
      "Shift scheduling",
      "Department assignments",
      "Leave management",
      "Overtime tracking",
      "Performance metrics",
    ],
  },
  {
    id: "emergency-protocols",
    title: "Emergency Protocols",
    description: "Handle emergency situations with predefined protocols",
    icon: AlertTriangle,
    iconColor: "bg-gradient-to-br from-red-500 to-red-600",
    badge: "Critical",
    subFeatures: [
      "Emergency alert system",
      "Rapid response coordination",
      "Resource mobilization",
      "Communication broadcasting",
      "Incident logging",
    ],
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    description: "Generate comprehensive reports and view analytics",
    icon: BarChart3,
    iconColor: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    subFeatures: [
      "Occupancy reports",
      "Financial summaries",
      "Patient statistics",
      "Trend analysis",
      "Custom report builder",
    ],
  },
  {
    id: "notifications",
    title: "Notification Center",
    description: "Manage alerts, announcements, and communications",
    icon: Bell,
    iconColor: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    subFeatures: [
      "Alert management",
      "Staff announcements",
      "Patient notifications",
      "System alerts",
      "Priority filtering",
    ],
  },
  {
    id: "settings",
    title: "Hospital Settings",
    description: "Configure hospital-wide settings and preferences",
    icon: Settings,
    iconColor: "bg-gradient-to-br from-gray-500 to-gray-600",
    subFeatures: [
      "Ward configuration",
      "User permissions",
      "System preferences",
      "Integration settings",
      "Backup management",
    ],
  },
];

// Medical Staff Features Configuration
export const medicalStaffFeatures = [
  {
    id: "my-patients",
    title: "My Patients",
    description: "View and manage your assigned patients",
    icon: Users,
    iconColor: "bg-gradient-to-br from-blue-500 to-blue-600",
    badge: "Primary",
    subFeatures: [
      "Patient list view",
      "Medical history access",
      "Treatment notes",
      "Prescription management",
      "Lab results",
    ],
  },
  {
    id: "patient-admission",
    title: "Patient Admission",
    description: "Admit new patients and manage intake process",
    icon: Plus,
    iconColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    badge: "Quick Action",
    subFeatures: [
      "New patient registration",
      "Emergency admission",
      "Ward assignment",
      "Insurance verification",
      "Consent forms",
    ],
  },
  {
    id: "bed-assignment",
    title: "Bed Assignment",
    description: "Assign and transfer patients to available beds",
    icon: Bed,
    iconColor: "bg-gradient-to-br from-violet-500 to-violet-600",
    subFeatures: [
      "Available bed view",
      "Ward-wise availability",
      "Bed transfer",
      "Special requirements",
      "Isolation protocols",
    ],
  },
  {
    id: "treatment-plans",
    title: "Treatment Plans",
    description: "Create and manage patient treatment protocols",
    icon: Stethoscope,
    iconColor: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    subFeatures: [
      "Treatment scheduling",
      "Medication management",
      "Procedure planning",
      "Follow-up scheduling",
      "Care team coordination",
    ],
  },
  {
    id: "waste-reporting",
    title: "Waste Reporting",
    description: "Report medical waste with AI-powered predictions",
    icon: Trash2,
    iconColor: "bg-gradient-to-br from-orange-500 to-orange-600",
    badge: "AI",
    subFeatures: [
      "Waste prediction by treatment",
      "Category selection",
      "Quantity reporting",
      "Disposal scheduling",
      "Compliance logging",
    ],
  },
  {
    id: "discharge",
    title: "Patient Discharge",
    description: "Process patient discharge and generate summaries",
    icon: CheckCircle,
    iconColor: "bg-gradient-to-br from-green-500 to-green-600",
    subFeatures: [
      "Discharge checklist",
      "Summary generation",
      "Follow-up scheduling",
      "Prescription handover",
      "Billing coordination",
    ],
  },
  {
    id: "vitals-monitoring",
    title: "Vitals Monitoring",
    description: "Track and monitor patient vital signs",
    icon: Heart,
    iconColor: "bg-gradient-to-br from-red-500 to-red-600",
    badge: "Real-time",
    subFeatures: [
      "Real-time vitals",
      "Alert thresholds",
      "Historical trends",
      "Critical alerts",
      "Device integration",
    ],
  },
  {
    id: "schedule",
    title: "My Schedule",
    description: "View and manage your work schedule and shifts",
    icon: Calendar,
    iconColor: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    subFeatures: [
      "Shift calendar",
      "On-call schedule",
      "Leave requests",
      "Swap requests",
      "Overtime tracking",
    ],
  },
];

// Super Admin Features Configuration
export const superAdminFeatures = [
  {
    id: "hospital-network",
    title: "Hospital Network",
    description: "Manage all hospitals across the district",
    icon: Building2,
    iconColor: "bg-gradient-to-br from-blue-500 to-blue-600",
    badge: "Overview",
    subFeatures: [
      "Hospital registry",
      "Capacity monitoring",
      "Performance metrics",
      "Resource allocation",
      "Network analytics",
    ],
  },
  {
    id: "outbreak-monitoring",
    title: "Outbreak Monitoring",
    description: "AI-powered disease outbreak prediction and tracking",
    icon: Shield,
    iconColor: "bg-gradient-to-br from-red-500 to-red-600",
    badge: "AI Critical",
    subFeatures: [
      "Disease tracking",
      "Outbreak prediction",
      "Risk assessment",
      "Alert broadcasting",
      "Response coordination",
    ],
  },
  {
    id: "bed-summary",
    title: "District Bed Summary",
    description: "Real-time bed availability across all hospitals",
    icon: Bed,
    iconColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    badge: "Real-time",
    subFeatures: [
      "Total capacity view",
      "Ward-type breakdown",
      "Occupancy trends",
      "Critical availability",
      "Forecast modeling",
    ],
  },
  {
    id: "emergency-coordination",
    title: "Emergency Coordination",
    description: "Coordinate emergency responses across hospitals",
    icon: Zap,
    iconColor: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    badge: "Priority",
    subFeatures: [
      "Emergency dashboard",
      "Resource deployment",
      "Hospital coordination",
      "Ambulance dispatch",
      "Crisis communication",
    ],
  },
  {
    id: "disease-trends",
    title: "Disease Trends",
    description: "Analyze disease patterns and healthcare trends",
    icon: TrendingUp,
    iconColor: "bg-gradient-to-br from-violet-500 to-violet-600",
    subFeatures: [
      "Trend analysis",
      "Seasonal patterns",
      "Geographic mapping",
      "Comparative reports",
      "Predictive insights",
    ],
  },
  {
    id: "hospital-registration",
    title: "Hospital Registration",
    description: "Register and onboard new hospitals",
    icon: Plus,
    iconColor: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    subFeatures: [
      "New hospital setup",
      "Capacity configuration",
      "Admin assignment",
      "System integration",
      "Compliance verification",
    ],
  },
  {
    id: "broadcast-notices",
    title: "Broadcast System",
    description: "Send notices and alerts to all hospitals",
    icon: Bell,
    iconColor: "bg-gradient-to-br from-orange-500 to-orange-600",
    subFeatures: [
      "Mass notifications",
      "Priority alerts",
      "Policy updates",
      "Emergency broadcasts",
      "Acknowledgment tracking",
    ],
  },
  {
    id: "analytics",
    title: "Advanced Analytics",
    description: "Comprehensive analytics and reporting dashboard",
    icon: BarChart3,
    iconColor: "bg-gradient-to-br from-indigo-500 to-indigo-600",
    subFeatures: [
      "Performance dashboards",
      "Comparative analysis",
      "Custom reports",
      "Export capabilities",
      "Data visualization",
    ],
  },
];

// Waste Management Features Configuration
export const wasteManagementFeatures = [
  {
    id: "pickup-requests",
    title: "Pickup Requests",
    description: "View and manage all waste pickup requests",
    icon: Clock,
    iconColor: "bg-gradient-to-br from-yellow-500 to-yellow-600",
    badge: "Primary",
    subFeatures: [
      "Request queue",
      "Priority sorting",
      "Hospital details",
      "Waste categorization",
      "Urgency levels",
    ],
  },
  {
    id: "collection-routes",
    title: "Collection Routes",
    description: "Optimized route planning for waste collection",
    icon: MapPin,
    iconColor: "bg-gradient-to-br from-blue-500 to-blue-600",
    badge: "AI Optimized",
    subFeatures: [
      "Route optimization",
      "GPS tracking",
      "Time estimates",
      "Traffic consideration",
      "Multi-stop planning",
    ],
  },
  {
    id: "waste-collection",
    title: "Waste Collection",
    description: "Record and track waste collection activities",
    icon: Trash2,
    iconColor: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    subFeatures: [
      "Collection logging",
      "Weight verification",
      "Photo documentation",
      "Digital signatures",
      "Chain of custody",
    ],
  },
  {
    id: "disposal-management",
    title: "Disposal Management",
    description: "Manage safe waste disposal and compliance",
    icon: CheckCircle,
    iconColor: "bg-gradient-to-br from-green-500 to-green-600",
    subFeatures: [
      "Disposal methods",
      "Facility selection",
      "Compliance logging",
      "Certificate generation",
      "Environmental reporting",
    ],
  },
  {
    id: "vehicle-fleet",
    title: "Vehicle Fleet",
    description: "Manage collection vehicles and maintenance",
    icon: Trash2,
    iconColor: "bg-gradient-to-br from-violet-500 to-violet-600",
    subFeatures: [
      "Vehicle tracking",
      "Maintenance schedule",
      "Fuel management",
      "Driver assignment",
      "Capacity planning",
    ],
  },
  {
    id: "billing",
    title: "Billing & Invoicing",
    description: "Generate invoices and track payments",
    icon: FileText,
    iconColor: "bg-gradient-to-br from-cyan-500 to-cyan-600",
    subFeatures: [
      "Invoice generation",
      "Payment tracking",
      "Rate management",
      "Hospital accounts",
      "Financial reports",
    ],
  },
  {
    id: "compliance",
    title: "Compliance Center",
    description: "Ensure regulatory compliance and certifications",
    icon: Shield,
    iconColor: "bg-gradient-to-br from-red-500 to-red-600",
    badge: "Required",
    subFeatures: [
      "Regulatory tracking",
      "Certification management",
      "Audit preparation",
      "Documentation",
      "Training records",
    ],
  },
  {
    id: "analytics",
    title: "Analytics & Reports",
    description: "View collection analytics and generate reports",
    icon: BarChart3,
    iconColor: "bg-gradient-to-br from-orange-500 to-orange-600",
    subFeatures: [
      "Collection metrics",
      "Trend analysis",
      "Hospital comparisons",
      "Environmental impact",
      "Custom reports",
    ],
  },
];

// Feature Detail Dialog Component
interface FeatureDetailDialogProps {
  feature: typeof hospitalAdminFeatures[0] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeatureDetailDialog({ feature, open, onOpenChange }: FeatureDetailDialogProps) {
  if (!feature) return null;
  const Icon = feature.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", feature.iconColor)}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle>{feature.title}</DialogTitle>
              <DialogDescription>{feature.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="py-4">
          <h4 className="font-semibold mb-3">Features Include:</h4>
          <ul className="space-y-2">
            {feature.subFeatures.map((subFeature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 text-sm"
              >
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {subFeature}
              </motion.li>
            ))}
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => {
            toast.success(`Opening ${feature.title}...`);
            onOpenChange(false);
          }}>
            Open Feature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Features Grid Component
interface FeaturesGridProps {
  features: typeof hospitalAdminFeatures;
  onFeatureClick?: (feature: typeof hospitalAdminFeatures[0]) => void;
}

export function FeaturesGrid({ features, onFeatureClick }: FeaturesGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature, index) => (
        <FeatureCard
          key={feature.id}
          title={feature.title}
          description={feature.description}
          icon={feature.icon}
          iconColor={feature.iconColor}
          badge={feature.badge}
          badgeVariant={feature.badge === "AI" || feature.badge === "AI Critical" || feature.badge === "AI Optimized" ? "default" : "secondary"}
          onClick={() => onFeatureClick?.(feature)}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
}
