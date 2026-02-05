"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  TrafficCone, 
  Settings, 
  Ambulance,
  Activity,
  Radio,
  Building2,
  Route,
  AlertTriangle
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const items = [
  {
    title: "Control Room",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Pending Cases",
    url: "/pending",
    icon: AlertTriangle,
  },
  {
    title: "Active Trips",
    url: "/trips",
    icon: Route,
  },
  {
    title: "Signal Simulation",
    url: "/signals",
    icon: TrafficCone,
  },
  {
    title: "System Status",
    url: "/system",
    icon: Radio,
  },
  {
    title: "Ambulances",
    url: "/ambulances",
    icon: Ambulance,
  },
  {
    title: "Hospitals",
    url: "/hospitals",
    icon: Building2,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-border bg-white">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2 font-bold text-primary-teal">
          <Activity className="size-6" />
          <span className="text-lg">Smart Routing</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-charcoal/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.url}
                    className={pathname === item.url ? "bg-secondary-mint text-primary-teal" : "text-charcoal hover:bg-muted"}
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-charcoal/50">System Status</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="px-2 py-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-charcoal/70">Network</span>
                <span className="text-green-600 font-medium">Stable</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-charcoal/70">Active Ambulances</span>
                <span className="text-primary-teal font-medium">12 / 15</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
