"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Bell, User, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold text-charcoal hidden md:block">
          AI-Based Smart Ambulance Routing System
        </h1>
        <h1 className="text-lg font-semibold text-charcoal md:hidden">
          Smart Routing
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-2.5 size-4 text-charcoal/40" />
          <Input 
            placeholder="Search ambulances, signals..." 
            className="w-64 pl-9 bg-off-white border-none focus-visible:ring-primary-teal"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5 text-charcoal/70" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-accent-amber" />
        </Button>
        
        <div className="flex items-center gap-2 border-l border-border pl-4">
          <div className="flex flex-col items-end text-right">
            <span className="text-sm font-medium text-charcoal">Admin Control</span>
            <span className="text-xs text-charcoal/50 text-green-600">Active</span>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full bg-secondary-mint">
            <User className="size-5 text-primary-teal" />
          </Button>
        </div>
      </div>
    </header>
  )
}
