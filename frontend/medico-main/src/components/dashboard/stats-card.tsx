"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "gradient" | "glass";
  iconColor?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  iconColor = "bg-primary",
  className,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 p-6",
        variant === "default" && "bg-card",
        variant === "gradient" && "bg-gradient-to-br from-card to-card/80",
        variant === "glass" && "glass-card",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="text-3xl font-bold tracking-tight text-foreground"
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </motion.span>
            {trend && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "flex items-center text-xs font-medium",
                  trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}
              >
                {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
              </motion.span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            iconColor
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </motion.div>
      </div>
    </motion.div>
  );
}

interface MiniStatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MiniStatsCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-primary",
  className,
}: MiniStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4",
        className
      )}
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-muted", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-lg font-semibold">{typeof value === "number" ? value.toLocaleString() : value}</p>
      </div>
    </motion.div>
  );
}

interface AlertBannerProps {
  title: string;
  message: string;
  type: "warning" | "error" | "info" | "success";
  onDismiss?: () => void;
}

export function AlertBanner({ title, message, type, onDismiss }: AlertBannerProps) {
  const colors = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950/50 dark:border-yellow-800 dark:text-yellow-200",
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/50 dark:border-red-800 dark:text-red-200",
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-200",
    success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/50 dark:border-green-800 dark:text-green-200",
  };

  const iconColors = {
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    success: "bg-green-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "flex items-center gap-4 rounded-xl border p-4",
        colors[type]
      )}
    >
      <div className="relative">
        <span className={cn("flex h-3 w-3 rounded-full", iconColors[type])}>
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-75", iconColors[type])} />
        </span>
      </div>
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm opacity-80">{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-current opacity-60 hover:opacity-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}
