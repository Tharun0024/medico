"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Building2,
  LayoutDashboard,
  Users,
  Bed,
  Ambulance,
  Trash2,
  Activity,
  Settings,
  ChevronLeft,
  Menu,
  Stethoscope,
  Truck,
  Shield,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type UserRole = "super-admin" | "hospital-admin" | "medical-staff" | "waste-management";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const roleConfig: Record<UserRole, { title: string; icon: React.ElementType; color: string; navItems: NavItem[] }> = {
  "super-admin": {
    title: "Government Portal",
    icon: Shield,
    color: "from-blue-600 to-cyan-500",
    navItems: [
      { title: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
      { title: "Hospitals", href: "/super-admin/hospitals", icon: Building2 },
      { title: "Outbreak Monitor", href: "/super-admin/outbreaks", icon: Activity },
      { title: "Ambulances", href: "/super-admin/ambulances", icon: Ambulance },
      { title: "Analytics", href: "/super-admin/analytics", icon: Activity },
      { title: "Settings", href: "/super-admin/settings", icon: Settings },
    ],
  },
  "hospital-admin": {
    title: "Hospital Admin",
    icon: Building2,
    color: "from-teal-600 to-emerald-500",
    navItems: [
      { title: "Dashboard", href: "/hospital-admin", icon: LayoutDashboard },
      { title: "Bed Management", href: "/hospital-admin/beds", icon: Bed },
      { title: "Patients", href: "/hospital-admin/patients", icon: Users },
      { title: "Waste Analytics", href: "/hospital-admin/waste", icon: Trash2 },
      { title: "Notifications", href: "/hospital-admin/notifications", icon: Activity, badge: 3 },
      { title: "Settings", href: "/hospital-admin/settings", icon: Settings },
    ],
  },
  "medical-staff": {
    title: "Medical Staff",
    icon: Stethoscope,
    color: "from-indigo-600 to-violet-500",
    navItems: [
      { title: "Dashboard", href: "/medical-staff", icon: LayoutDashboard },
      { title: "Add Patient", href: "/medical-staff/add-patient", icon: Users },
      { title: "Patient List", href: "/medical-staff/patients", icon: Users },
      { title: "Bed Assignment", href: "/medical-staff/beds", icon: Bed },
      { title: "Waste Report", href: "/medical-staff/waste", icon: Trash2 },
    ],
  },
  "waste-management": {
    title: "Waste Management",
    icon: Truck,
    color: "from-orange-600 to-amber-500",
    navItems: [
      { title: "Dashboard", href: "/waste-management", icon: LayoutDashboard },
      { title: "Pickup Requests", href: "/waste-management/requests", icon: Trash2, badge: 5 },
      { title: "Collection History", href: "/waste-management/history", icon: Activity },
      { title: "Payments", href: "/waste-management/payments", icon: Activity },
    ],
  },
};

interface AppSidebarProps {
  role: UserRole;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function AppSidebar({ role, collapsed = false, onCollapsedChange }: AppSidebarProps) {
  const pathname = usePathname();
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen border-r border-border/50",
          "bg-sidebar/95 backdrop-blur-xl",
          "flex flex-col"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-4">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-3"
              >
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br", config.color)}>
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-foreground">MediCare+</span>
                  <span className="text-[10px] text-muted-foreground">{config.title}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className="h-8 w-8 shrink-0"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <ul className="space-y-1">
            {config.navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              const linkContent = (
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className={cn("relative h-5 w-5 shrink-0", isActive && "text-primary-foreground")} />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative truncate"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {item.badge && !collapsed && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        "relative ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-destructive text-destructive-foreground"
                      )}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.title}
                        {item.badge && (
                          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    linkContent
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-3">
          <div className={cn(
            "flex items-center gap-3 rounded-xl p-3",
            "bg-gradient-to-r from-primary/10 to-transparent"
          )}>
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br",
              config.color
            )}>
              <RoleIcon className="h-4 w-4 text-white" />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col overflow-hidden"
                >
                  <span className="truncate text-sm font-medium">Active Role</span>
                  <span className="truncate text-xs text-muted-foreground capitalize">
                    {role.replace("-", " ")}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
