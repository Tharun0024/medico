"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  BarChart3,
  Bed,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  LineChart,
  MapPin,
  MessageSquare,
  PieChart,
  Settings,
  Shield,
  Stethoscope,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Feature Card Component
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor?: string;
  onClick?: () => void;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  disabled?: boolean;
  delay?: number;
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
  iconColor = "bg-primary",
  onClick,
  badge,
  badgeVariant = "secondary",
  disabled = false,
  delay = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "relative flex cursor-pointer flex-col gap-3 rounded-2xl border border-border/50 bg-card p-5 transition-all hover:shadow-lg",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconColor)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {badge && (
          <Badge variant={badgeVariant} className="text-xs">
            {badge}
          </Badge>
        )}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}

// Quick Action Button
interface QuickActionProps {
  label: string;
  icon: React.ElementType;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function QuickAction({
  label,
  icon: Icon,
  onClick,
  variant = "outline",
  className,
}: QuickActionProps) {
  return (
    <Button variant={variant} onClick={onClick} className={cn("gap-2", className)}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

// Metric Card with Progress
interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  delay?: number;
}

export function MetricCard({
  label,
  value,
  subValue,
  trend,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className="rounded-xl border border-border/50 bg-card p-4"
    >
      <div className="mb-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold">{value}</span>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-sm",
            trend.isPositive ? "text-green-500" : "text-red-500"
          )}>
            <TrendingUp className={cn("h-4 w-4", !trend.isPositive && "rotate-180")} />
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      {subValue && (
        <p className="mt-1 text-xs text-muted-foreground">{subValue}</p>
      )}
    </motion.div>
  );
}

// Activity Item
interface ActivityItemProps {
  type: "info" | "success" | "warning" | "error" | "alert";
  message: string;
  time: string;
  index?: number;
}

export function ActivityItem({
  type,
  message,
  time,
  index = 0,
}: ActivityItemProps) {
  const typeColors = {
    info: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    success: "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400",
    warning: "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
    error: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
    alert: "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
  };

  const typeIcons = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    error: "✕",
    alert: "🔔",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm", typeColors[type])}>
        {typeIcons[type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{message}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
    </motion.div>
  );
}

// Status Overview Card
interface StatusOverviewProps {
  items: {
    label: string;
    value: number;
    color: string;
  }[];
  title?: string;
}

export function StatusOverview({ items, title }: StatusOverviewProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="space-y-3">
      {title && <h4 className="font-semibold mb-4">{title}</h4>}
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("h-3 w-3 rounded-full", item.color)} />
            <span className="text-sm">{item.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{item.value}</span>
            {total > 0 && (
              <span className="text-xs text-muted-foreground">
                ({((item.value / total) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Schedule Item
interface ScheduleItemProps {
  title: string;
  time: string;
  status: "upcoming" | "in-progress" | "completed";
  priority?: "low" | "medium" | "high";
}

export function ScheduleItem({ title, time, status, priority = "medium" }: ScheduleItemProps) {
  const statusColors = {
    upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    "in-progress": "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  };

  const priorityColors = {
    low: "border-l-green-500",
    medium: "border-l-yellow-500",
    high: "border-l-red-500",
  };

  return (
    <div className={cn("border-l-4 pl-3 py-2", priorityColors[priority])}>
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{title}</p>
        <Badge variant="outline" className={cn("text-xs", statusColors[status])}>
          {status}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{time}</p>
    </div>
  );
}

// Compact Stat
interface CompactStatProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
}

export function CompactStat({ label, value, icon: Icon, trend }: CompactStatProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
      {trend && (
        <span
          className={cn(
            "text-xs font-medium",
            trend.isPositive ? "text-green-600" : "text-red-600"
          )}
        >
          {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
        </span>
      )}
    </div>
  );
}

// Feature Icons Export for easy use
export const FeatureIcons = {
  Activity,
  AlertTriangle,
  Ambulance,
  BarChart3,
  Bed,
  Bell,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Heart,
  LineChart,
  MapPin,
  MessageSquare,
  PieChart,
  Settings,
  Shield,
  Stethoscope,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Users,
  Zap,
};
