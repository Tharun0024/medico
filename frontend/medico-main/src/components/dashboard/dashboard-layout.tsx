"use client";

import * as React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppSidebar, UserRole } from "./app-sidebar";
import { TopNavbar } from "./top-navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: UserRole;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  userName?: string;
  userRole?: string;
}

export function DashboardLayout({
  children,
  role,
  title,
  breadcrumbs = [],
  userName,
  userRole,
}: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        role={role}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex min-h-screen flex-col"
      >
        <TopNavbar
          title={title}
          breadcrumbs={breadcrumbs}
          userName={userName}
          userRole={userRole}
        />
        
        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </motion.div>
    </div>
  );
}

// Section wrapper component
interface DashboardSectionProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  description,
  action,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between">
          <div>
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// Card wrapper with animation
interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        "rounded-2xl border border-border/50 bg-card p-6 shadow-sm",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// Grid layouts
interface DashboardGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function DashboardGrid({ children, cols = 4, className }: DashboardGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[cols], className)}>{children}</div>
  );
}
