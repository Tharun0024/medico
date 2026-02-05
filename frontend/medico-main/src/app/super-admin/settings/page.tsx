"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  AnimatedCard,
} from "@/components/dashboard";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Mail,
  Save,
  RefreshCw,
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    emergencyAlerts: true,
    outbreakAlerts: true,
    systemUpdates: false,
  });

  const handleSave = () => {
    toast.success("Settings saved successfully");
  };

  return (
    <DashboardLayout
      role="super-admin"
      title="Settings"
      breadcrumbs={[
        { label: "Dashboard", href: "/super-admin" },
        { label: "Settings" },
      ]}
      userName="Super Admin"
      userRole="Government Administrator"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Profile Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your account information</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" defaultValue="Super Administrator" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" defaultValue="admin@healthcare.gov.in" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" defaultValue="+91 11-2345-6789" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" defaultValue="Ministry of Health & Family Welfare" />
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Appearance</h3>
                <p className="text-sm text-muted-foreground">Customize the dashboard appearance</p>
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
                      <SelectItem value="ta">Tamil</SelectItem>
                      <SelectItem value="te">Telugu</SelectItem>
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
                <h3 className="text-lg font-semibold">Alert Settings</h3>
                <p className="text-sm text-muted-foreground">Configure critical alert preferences</p>
              </div>
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Emergency Alerts</Label>
                    <p className="text-sm text-muted-foreground">Critical emergency notifications</p>
                  </div>
                  <Switch
                    checked={notifications.emergencyAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emergencyAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Outbreak Alerts</Label>
                    <p className="text-sm text-muted-foreground">Disease outbreak notifications</p>
                  </div>
                  <Switch
                    checked={notifications.outbreakAlerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, outbreakAlerts: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>System Updates</Label>
                    <p className="text-sm text-muted-foreground">Platform maintenance alerts</p>
                  </div>
                  <Switch
                    checked={notifications.systemUpdates}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, systemUpdates: checked })}
                  />
                </div>
              </div>
            </AnimatedCard>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Password & Authentication</h3>
                <p className="text-sm text-muted-foreground">Manage your security settings</p>
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

          <TabsContent value="system" className="space-y-6 mt-6">
            <AnimatedCard>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">System Configuration</h3>
                <p className="text-sm text-muted-foreground">Advanced system settings</p>
              </div>
              <div className="grid gap-6 max-w-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>API Rate Limiting</Label>
                    <p className="text-sm text-muted-foreground">Requests per minute</p>
                  </div>
                  <Select defaultValue="1000">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="500">500/min</SelectItem>
                      <SelectItem value="1000">1000/min</SelectItem>
                      <SelectItem value="2000">2000/min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Data Retention</Label>
                    <p className="text-sm text-muted-foreground">How long to keep logs</p>
                  </div>
                  <Select defaultValue="90">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto Backup</Label>
                    <p className="text-sm text-muted-foreground">Automatic database backups</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </AnimatedCard>

            <AnimatedCard delay={0.1}>
              <div className="mb-6">
                <h3 className="text-lg font-semibold">System Status</h3>
                <p className="text-sm text-muted-foreground">Current system health</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">API Server</p>
                    <p className="text-xs text-muted-foreground">Operational</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Database</p>
                    <p className="text-xs text-muted-foreground">Healthy</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">WebSocket</p>
                    <p className="text-xs text-muted-foreground">Connected</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">Cache</p>
                    <p className="text-xs text-muted-foreground">85% utilized</p>
                  </div>
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
