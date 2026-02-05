"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  DashboardLayout,
  DashboardSection,
  AnimatedCard,
  StatsCard,
  DashboardGrid,
} from "@/components/dashboard";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  Filter,
  Search,
  Settings,
  Trash2,
  Eye,
  BellOff,
  Bed,
  Users,
  Activity,
  Biohazard,
  RefreshCw,
  Wifi,
  WifiOff,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { notificationsApi } from "@/lib/api/notifications";
import { useAuth } from "@/lib/auth/auth-context";
import type { Notification, NotificationSeverity } from "@/lib/api/types";

/* ---------------------------------- */
/* WEBSOCKET CONFIG                    */
/* ---------------------------------- */

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

/* ---------------------------------- */
/* UI NOTIFICATION TYPE                */
/* ---------------------------------- */

interface UINotification {
  id: string;
  type: "emergency" | "warning" | "success" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
  category: string;
  isNew?: boolean; // For highlighting new WS notifications
  rawData?: Notification; // Original backend data
}

/* ---------------------------------- */
/* HELPER FUNCTIONS                    */
/* ---------------------------------- */

function mapSeverityToType(severity: NotificationSeverity): UINotification["type"] {
  switch (severity) {
    case "critical":
      return "emergency";
    case "error":
      return "emergency";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default:
      return "info";
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} mins ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
}

function mapBackendNotification(n: Notification): UINotification {
  return {
    id: n.id,
    type: mapSeverityToType(n.severity),
    title: n.title,
    message: n.message,
    time: formatTimeAgo(n.created_at),
    read: n.read_at !== null,
    category: n.recipient_role || "general",
    isNew: false,
    rawData: n,
  };
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case "emergency":
      return <AlertTriangle className="h-5 w-5 text-red-500" />;
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    case "success":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "info":
      return <Info className="h-5 w-5 text-blue-500" />;
    default:
      return <Bell className="h-5 w-5" />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "patient":
      return <Users className="h-4 w-4" />;
    case "bed":
      return <Bed className="h-4 w-4" />;
    case "waste":
      return <Biohazard className="h-4 w-4" />;
    case "staff":
      return <Users className="h-4 w-4" />;
    case "equipment":
      return <Activity className="h-4 w-4" />;
    case "hospital_admin":
      return <Bed className="h-4 w-4" />;
    case "medical_staff":
      return <Users className="h-4 w-4" />;
    case "waste_team":
      return <Biohazard className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [notifications, setNotifications] = useState<UINotification[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState<string | null>(null);
  
  // WebSocket state
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /* ---------------------------------- */
  /* FETCH NOTIFICATIONS                 */
  /* ---------------------------------- */

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.getNotifications();
      const mapped = response.items.map(mapBackendNotification);
      setNotifications(mapped);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Failed to load notifications. Please check if the server is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------------------------- */
  /* WEBSOCKET CONNECTION                */
  /* ---------------------------------- */

  const connectWebSocket = useCallback(() => {
    if (!user) return;

    const role = user.role;
    const hospitalId = user.hospitalId;
    const wsUrl = `${WS_BASE_URL}/ws?role=${role}${hospitalId ? `&hospital_id=${hospitalId}` : ""}`;

    console.log("[WS] Connecting to:", wsUrl);

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("[WS] Connected");
        setWsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("[WS] Message received:", data);

          // Handle notification events
          if (data.type === "notification" || data.type === "notification.created") {
            const newNotification: UINotification = {
              id: data.data?.notification_id || data.data?.id || `ws-${Date.now()}`,
              type: mapSeverityToType(data.data?.severity || "info"),
              title: data.data?.title || "New Notification",
              message: data.data?.message || "",
              time: "Just now",
              read: false,
              category: data.data?.recipient_role || "general",
              isNew: true,
            };

            setNotifications((prev) => [newNotification, ...prev]);

            // Remove "new" highlight after 5 seconds
            setTimeout(() => {
              setNotifications((prev) =>
                prev.map((n) =>
                  n.id === newNotification.id ? { ...n, isNew: false } : n
                )
              );
            }, 5000);
          }
        } catch (err) {
          console.error("[WS] Failed to parse message:", err);
        }
      };

      ws.onerror = (event) => {
        console.error("[WS] Error:", event);
        setWsConnected(false);
      };

      ws.onclose = (event) => {
        console.log("[WS] Closed:", event.code, event.reason);
        setWsConnected(false);
        wsRef.current = null;

        // Attempt reconnection after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[WS] Attempting reconnection...");
          connectWebSocket();
        }, 5000);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("[WS] Connection failed:", err);
      setWsConnected(false);
    }
  }, [user]);

  /* ---------------------------------- */
  /* LIFECYCLE                           */
  /* ---------------------------------- */

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  /* ---------------------------------- */
  /* COMPUTED VALUES                     */
  /* ---------------------------------- */

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || notification.type === selectedType;
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "unread" && !notification.read) ||
      notification.category === activeTab;
    return matchesSearch && matchesType && matchesTab;
  });

  const stats = {
    total: notifications.length,
    unread: notifications.filter((n) => !n.read).length,
    emergency: notifications.filter((n) => n.type === "emergency").length,
    today: notifications.filter((n) =>
      n.time.includes("mins") || n.time.includes("hour") || n.time === "Just now"
    ).length,
  };

  /* ---------------------------------- */
  /* ACTIONS                             */
  /* ---------------------------------- */

  const markAsRead = async (id: string) => {
    setMarkingRead(id);
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    } finally {
      setMarkingRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const deleteNotification = (id: string) => {
    // Local delete only (no backend endpoint)
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <DashboardLayout
      role="hospital-admin"
      title="Notifications"
      breadcrumbs={[
        { label: "Dashboard", href: "/hospital-admin" },
        { label: "Notifications" },
      ]}
      userName="Hospital Admin"
      userRole="City General Hospital"
    >
      <div className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {wsConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                <Wifi className="h-3 w-3 mr-1" />
                Live Updates
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                <WifiOff className="h-3 w-3 mr-1" />
                Connecting...
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Connection Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && notifications.length === 0 && !error && (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="animate-spin h-8 w-8 text-muted-foreground mr-3" />
            <span className="text-muted-foreground">Loading notifications...</span>
          </div>
        )}

        {/* Stats */}
        {!loading && (
          <DashboardGrid cols={4}>
            <StatsCard
              title="Total Notifications"
              value={stats.total}
              icon={Bell}
              subtitle="All time"
            />
            <StatsCard
              title="Unread"
              value={stats.unread}
              icon={Bell}
              subtitle="Require attention"
              className="border-blue-200 dark:border-blue-900"
            />
            <StatsCard
              title="Emergency Alerts"
              value={stats.emergency}
              icon={AlertTriangle}
              subtitle="High priority"
              className="border-red-200 dark:border-red-900"
            />
            <StatsCard
              title="Today"
              value={stats.today}
              icon={Clock}
              subtitle="Received today"
            />
          </DashboardGrid>
        )}

        {/* Filters and Actions */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Mark All Read
              </Button>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </AnimatedCard>

        {/* Tabs and Notifications List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread
              {stats.unread > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
                  {stats.unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patient">Patients</TabsTrigger>
            <TabsTrigger value="bed">Beds</TabsTrigger>
            <TabsTrigger value="waste">Waste</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <AnimatedCard>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <BellOff className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      You're all caught up!
                    </p>
                  </div>
                </AnimatedCard>
              ) : (
                filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                        !notification.read && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
                        notification.isNew && "ring-2 ring-green-400 bg-green-50/50 dark:bg-green-950/20"
                      )}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                        {getTypeIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={cn("font-semibold", !notification.read && "text-blue-700 dark:text-blue-300")}>
                            {notification.title}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {getCategoryIcon(notification.category)}
                            <span className="ml-1">{notification.category}</span>
                          </Badge>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          )}
                          {notification.isNew && (
                            <Badge className="bg-green-500 text-white text-xs">NEW</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {notification.time}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            disabled={markingRead === notification.id}
                          >
                            {markingRead === notification.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
