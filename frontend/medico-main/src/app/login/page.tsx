"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth, ROLE_CONFIG } from "@/lib/auth/auth-context";
import type { UserRole } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  Building2,
  Stethoscope,
  Truck,
  Ambulance,
  Radio,
  ArrowRight,
  Heart,
} from "lucide-react";

const roleIcons: Record<UserRole, React.ComponentType<{ className?: string }>> = {
  super_admin: Shield,
  hospital_admin: Building2,
  medical_staff: Stethoscope,
  waste_team: Truck,
  emergency_service: Ambulance,
  control_room: Radio,
};

const roleColors: Record<UserRole, string> = {
  super_admin: "from-blue-500 to-cyan-500",
  hospital_admin: "from-emerald-500 to-teal-500",
  medical_staff: "from-purple-500 to-pink-500",
  waste_team: "from-orange-500 to-amber-500",
  emergency_service: "from-red-500 to-rose-500",
  control_room: "from-indigo-500 to-violet-500",
};

// Mock hospitals for demo
const DEMO_HOSPITALS = [
  { id: 1, name: "City General Hospital" },
  { id: 2, name: "Metro Medical Center" },
  { id: 3, name: "Green Valley Hospital" },
  { id: 4, name: "Sunrise Healthcare" },
  { id: 5, name: "Apollo Healthcare" },
];

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  // Get role from query param for pre-selection
  const roleFromQuery = searchParams.get("role") as UserRole | null;
  const [selectedRole, setSelectedRole] = useState<UserRole | "">(roleFromQuery || "");
  const [hospitalId, setHospitalId] = useState<string>("1"); // Default to hospital 1 for demo
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  const redirect = searchParams.get("redirect");
  const requiresHospital = selectedRole && ROLE_CONFIG[selectedRole as UserRole]?.requiresHospital;

  // Auto-login when role is provided via query param (for demo convenience)
  useEffect(() => {
    if (roleFromQuery && !autoLoginAttempted) {
      setAutoLoginAttempted(true);
      const config = ROLE_CONFIG[roleFromQuery];
      if (config) {
        const autoHospitalId = config.requiresHospital ? 1 : null;
        login(roleFromQuery, autoHospitalId);
        if (redirect) {
          router.push(redirect);
        }
      }
    }
  }, [roleFromQuery, autoLoginAttempted, login, redirect, router]);

  const handleLogin = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    
    try {
      // Simulate a small delay for realistic feel
      await new Promise((r) => setTimeout(r, 500));
      
      const hospitalIdNum = requiresHospital && hospitalId ? parseInt(hospitalId, 10) : null;
      
      login(
        selectedRole as UserRole,
        hospitalIdNum,
        displayName || undefined
      );
      
      // Redirect to original page or role's dashboard
      if (redirect) {
        router.push(redirect);
      }
      // login() already handles the redirect
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo and Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur-lg opacity-50" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg">
                <Heart className="h-8 w-8" />
              </div>
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                MEDICO
              </h1>
              <p className="text-sm text-muted-foreground">
                Smart Hospital Management
              </p>
            </div>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full max-w-md"
        >
          <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Select your role to access the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Select Your Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(value) => {
                    setSelectedRole(value as UserRole);
                    // Clear hospital if role doesn't need it
                    if (!ROLE_CONFIG[value as UserRole]?.requiresHospital) {
                      setHospitalId("");
                    }
                  }}
                >
                  <SelectTrigger id="role" className="h-12">
                    <SelectValue placeholder="Choose a role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(
                      ([role, config]) => {
                        const Icon = roleIcons[role];
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${roleColors[role]} text-white`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        );
                      }
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Hospital Selection (conditional) */}
              {requiresHospital && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="hospital">Select Hospital</Label>
                  <Select value={hospitalId} onValueChange={setHospitalId}>
                    <SelectTrigger id="hospital" className="h-12">
                      <SelectValue placeholder="Choose a hospital..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DEMO_HOSPITALS.map((hospital) => (
                        <SelectItem key={hospital.id} value={String(hospital.id)}>
                          {hospital.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              {/* Display Name (optional) */}
              <div className="space-y-2">
                <Label htmlFor="name">Display Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Enter your name..."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Login Button */}
              <Button
                onClick={handleLogin}
                disabled={
                  !selectedRole ||
                  (requiresHospital && !hospitalId) ||
                  isLoading
                }
                className={`w-full h-12 text-lg font-medium bg-gradient-to-r ${
                  selectedRole ? roleColors[selectedRole as UserRole] : "from-gray-400 to-gray-500"
                } hover:opacity-90 transition-opacity`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continue to Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              {/* Info note */}
              <p className="text-xs text-center text-muted-foreground">
                This is a demo system. No actual authentication required.
                <br />
                Role-based access controls apply to API requests.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Role Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-3 md:grid-cols-6 gap-3"
        >
          {(Object.entries(ROLE_CONFIG) as [UserRole, typeof ROLE_CONFIG[UserRole]][]).map(
            ([role, config]) => {
              const Icon = roleIcons[role];
              return (
                <button
                  key={role}
                  onClick={() => {
                    setSelectedRole(role);
                    // For non-hospital roles, auto-login
                    if (!config.requiresHospital) {
                      setTimeout(() => {
                        login(role, null);
                      }, 100);
                    }
                  }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all hover:scale-105 ${
                    selectedRole === role
                      ? `bg-gradient-to-br ${roleColors[role]} text-white shadow-lg`
                      : "bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {config.label}
                  </span>
                </button>
              );
            }
          )}
        </motion.div>
      </div>
    </div>
  );
}
