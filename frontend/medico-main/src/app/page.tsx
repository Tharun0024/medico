"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Shield,
  Building2,
  Stethoscope,
  Truck,
  ArrowRight,
  Heart,
  Activity,
  Ambulance,
  AlertTriangle,
} from "lucide-react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

const roles = [
  {
    title: "Government Portal",
    subtitle: "Super Admin Dashboard",
    description: "City-wide health analytics, outbreak monitoring, hospital management, and ambulance fleet control.",
    icon: Shield,
    href: "/super-admin",
    gradient: "from-blue-600 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
    features: ["Regional Overview", "Outbreak Prediction", "Hospital Network Map", "Analytics Dashboard"],
  },
  {
    title: "Control Room",
    subtitle: "Ambulance Dispatch Center",
    description: "Real-time ambulance tracking, emergency dispatch, traffic signal control, and trip management.",
    icon: Ambulance,
    href: "/control-room",
    gradient: "from-purple-600 to-pink-500",
    bgGradient: "from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30",
    features: ["Live Map View", "Ambulance Fleet", "Signal Control", "Emergency Dispatch"],
  },
  {
    title: "Emergency Services",
    subtitle: "Emergency Board",
    description: "Monitor and manage emergency cases in real-time with hospital load suggestions.",
    icon: AlertTriangle,
    href: "/emergency",
    gradient: "from-red-600 to-rose-500",
    bgGradient: "from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30",
    features: ["Emergency Cases", "Hospital Suggestions", "Case Assignment", "Real-time Updates"],
  },
  {
    title: "Hospital Admin",
    subtitle: "Control Panel",
    description: "Manage beds, monitor patients, track medical waste, and receive AI-powered insights.",
    icon: Building2,
    href: "/hospital-admin",
    gradient: "from-teal-600 to-emerald-500",
    bgGradient: "from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30",
    features: ["Bed Management", "Patient Tracking", "Waste Analytics", "Real-time Notifications"],
  },
  {
    title: "Medical Staff",
    subtitle: "Clinical Portal",
    description: "Fast patient admission, bed assignments, and AI-powered medical waste prediction.",
    icon: Stethoscope,
    href: "/medical-staff",
    gradient: "from-indigo-600 to-violet-500",
    bgGradient: "from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30",
    features: ["Quick Patient Add", "Bed Assignment", "Discharge Management", "Waste Prediction"],
  },
  {
    title: "Waste Management",
    subtitle: "Operations Dashboard",
    description: "Track pickup requests, manage routes, and handle payments for medical waste disposal.",
    icon: Truck,
    href: "/waste-management",
    gradient: "from-orange-600 to-amber-500",
    bgGradient: "from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30",
    features: ["Pickup Requests", "Route Planning", "Payment Tracking", "Disposal History"],
  },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="fixed right-6 top-6 z-50"
    >
      {resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <ThemeToggle />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
          {/* Logo and Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mb-6 flex items-center justify-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyan-500 shadow-lg shadow-primary/25">
                <Heart className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              MediCare<span className="text-primary">+</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Enterprise-grade Smart Hospital Management System with AI-powered insights
              and integrated ambulance emergency platform.
            </p>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Hospitals", value: "8+", icon: Building2 },
                { label: "Beds Managed", value: "2,880", icon: Activity },
                { label: "Patients", value: "12,847", icon: Stethoscope },
                { label: "Ambulances", value: "8", icon: Ambulance },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="rounded-2xl border border-border/50 bg-card/50 p-4 backdrop-blur-sm"
                >
                  <stat.icon className="mb-2 h-5 w-5 text-primary" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Role Cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-20"
          >
            <h2 className="mb-8 text-center text-lg font-semibold text-muted-foreground">
              Select your dashboard
            </h2>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {roles.map((role, index) => {
                const Icon = role.icon;
                
                return (
                  <motion.div
                    key={role.href}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Link href={role.href}>
                      <motion.div
                        whileHover={{ y: -8, transition: { duration: 0.2 } }}
                        className={cn(
                          "group relative h-full overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br p-6 transition-shadow hover:shadow-xl",
                          role.bgGradient
                        )}
                      >
                        {/* Gradient overlay on hover */}
                        <div
                          className={cn(
                            "absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-10",
                            role.gradient
                          )}
                        />

                        {/* Icon */}
                        <div
                          className={cn(
                            "mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                            role.gradient
                          )}
                        >
                          <Icon className="h-7 w-7 text-white" />
                        </div>

                        {/* Content */}
                        <div className="relative">
                          <h3 className="text-lg font-semibold">{role.title}</h3>
                          <p className="mb-2 text-xs text-muted-foreground">{role.subtitle}</p>
                          <p className="mb-4 text-sm text-muted-foreground line-clamp-2">
                            {role.description}
                          </p>

                          {/* Features */}
                          <div className="mb-4 flex flex-wrap gap-1">
                            {role.features.slice(0, 3).map((feature) => (
                              <span
                                key={feature}
                                className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>

                          {/* CTA */}
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            Open Dashboard
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-20 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Built for modern healthcare infrastructure. Powered by AI.
            </p>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                All systems operational
              </span>
              <span>|</span>
              <span>v1.0.0</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
