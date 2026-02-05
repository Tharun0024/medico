"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Bell,
  Search,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { notifications as mockNotifications } from "@/lib/mock-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface TopNavbarProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export function TopNavbar({
  title,
  breadcrumbs = [],
  userName = "Dr. Sarah Wilson",
  userRole = "Administrator",
}: TopNavbarProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl">
      {/* Left side - Breadcrumbs and Title */}
      <div className="flex flex-col">
        {breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-0.5">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href} className="text-xs">
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="text-xs">{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <motion.div
            initial={false}
            animate={{ width: searchOpen ? 240 : 40 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {searchOpen ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="h-10 pl-9 pr-4"
                  autoFocus
                  onBlur={() => setSearchOpen(false)}
                />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="h-10 w-10"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </motion.div>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-10 w-10"
        >
          <motion.div
            initial={false}
            animate={{ rotate: resolvedTheme === "dark" ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            {resolvedTheme === "dark" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </motion.div>
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-10 w-10">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
                >
                  {unreadCount}
                </motion.span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Notifications</h4>
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {mockNotifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex gap-3 border-b border-border/50 p-4 transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                      notification.type === "error" && "bg-destructive",
                      notification.type === "warning" && "bg-yellow-500",
                      notification.type === "success" && "bg-green-500",
                      notification.type === "info" && "bg-blue-500"
                    )}
                  />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(notification.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                View all notifications
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-10 items-center gap-2 px-2 hover:bg-accent"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-[10px] text-muted-foreground">{userRole}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
