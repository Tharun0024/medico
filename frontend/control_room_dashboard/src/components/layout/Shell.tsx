"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { AppHeader } from "./AppHeader"

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col bg-off-white">
        <AppHeader />
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
