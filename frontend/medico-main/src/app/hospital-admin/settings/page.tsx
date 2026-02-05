"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  AnimatedCard,
} from "@/components/dashboard";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Building,
  Users,
  Key,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function HospitalSettingsPage() {
  const [activeTab, setActiveTab] = useState("hospital");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    bedAlerts: true,
    patientAlerts: true,
    wasteAlerts: true,
  });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <DashboardLayout
      role="hospital-admin"
      title="Settings"
      breadcrumbs={[
        { label: "Dashboard", href: "/hospital-admin" },
        { label: "Settings" },
      ]}
      userName="Hospital Admin"
      userRole="City General Hospital"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="hospital" className="flex items-center gap-2">
              <Building className="h-4 w-4" />
              Hospital
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hospital" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Hospital Information</h3>
                <p className="text-sm text-muted-foreground">Manage hospital details and settings</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="grid gap-2">
                  <Label htmlFor="hospital-name">Hospital Name</Label>
                  <Input id="hospital-name" defaultValue="City General Hospital" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="registration">Registration Number</Label>
                  <Input id="registration" defaultValue="MH/2024/12345" disabled />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" defaultValue="123 Medical Street, Mumbai, Maharashtra - 400001" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" defaultValue="+91 22-2345-6789" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emergency">Emergency Number</Label>
                    <Input id="emergency" defaultValue="+91 22-2345-6790" />
                  </div>
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Capacity Settings</h3>
                <p className="text-sm text-muted-foreground">Configure hospital capacity limits</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="total-beds">Total Beds</Label>
                    <Input id="total-beds" type="number" defaultValue="250" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="icu-beds">ICU Beds</Label>
                    <Input id="icu-beds" type="number" defaultValue="30" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bed Capacity Alert</Label>
                    <p className="text-sm text-muted-foreground">Alert when occupancy exceeds threshold</p>
                  </div>
                  <Select defaultValue="80">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="70">70%</SelectItem>
                      <SelectItem value="80">80%</SelectItem>
                      <SelectItem value="90">90%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your account information</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Dr. Rajesh Sharma" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="admin@citygeneralhospital.in" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+91 98765-43210" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" defaultValue="Hospital Administrator" />
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Preferences</h3>
                <p className="text-sm text-muted-foreground">Customize your experience</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred theme</p>
                  </div>
                  <Select defaultValue="system">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Language</Label>
                    <p className="text-sm text-muted-foreground">Select your preferred language</p>
                  </div>
                  <Select defaultValue="en">
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Notification Preferences</h3>
                <p className="text-sm text-muted-foreground">Choose how you want to receive notifications</p>
              </div>
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch
                    checked={notifications.email}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, email: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">Browser push notifications</p>
                  </div>
                  <Switch
                    checked={notifications.push}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, push: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Critical alerts via SMS</p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                  />
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Alert Categories</h3>
                <p className="text-sm text-muted-foreground">Configure which alerts to receive</p>
              </div>
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Bed Availability Alerts</Label>
                    <p className="text-sm text-muted-foreground">When bed capacity is critical</p>
                  </div>
                  <Switch
                    checked={notifications.bedAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, bedAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Patient Alerts</Label>
                    <p className="text-sm text-muted-foreground">Admissions, discharges, emergencies</p>
                  </div>
                  <Switch
                    checked={notifications.patientAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, patientAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Waste Management Alerts</Label>
                    <p className="text-sm text-muted-foreground">Collection schedules and reminders</p>
                  </div>
                  <Switch
                    checked={notifications.wasteAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, wasteAlerts: checked })}
                  />
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Password</h3>
                <p className="text-sm text-muted-foreground">Update your password</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="grid gap-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button className="w-fit">
                  <Key className="mr-2 h-4 w-4" />
                  Update Password
                </Button>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
              </div>
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                      <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Enabled via Authenticator App</p>
                    </div>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
