"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  onRowClick?: (item: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = "No data available",
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn("overflow-hidden rounded-xl border border-border/50", className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border/50 bg-muted/50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {[...Array(5)].map((_, rowIndex) => (
                <tr key={rowIndex} className="bg-card">
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card p-12",
          className
        )}
      >
        <div className="mb-4 rounded-full bg-muted p-4">
          <svg
            className="h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/50", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-border/50 bg-muted/50">
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground",
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((item, rowIndex) => (
              <motion.tr
                key={item.id ?? rowIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.03 }}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "bg-card transition-colors",
                  onRowClick && "cursor-pointer hover:bg-muted/50"
                )}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={cn("px-4 py-3 text-sm", column.className)}>
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T] ?? "")}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Status badge component for tables
interface StatusBadgeProps {
  status: string;
  variant?: "default" | "outline";
}

export function StatusBadge({ status, variant = "default" }: StatusBadgeProps) {
  const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
    inactive: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300", border: "border-gray-200 dark:border-gray-700" },
    maintenance: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
    critical: { bg: "bg-red-100 dark:bg-red-950", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" },
    serious: { bg: "bg-orange-100 dark:bg-orange-950", text: "text-orange-700 dark:text-orange-300", border: "border-orange-200 dark:border-orange-800" },
    stable: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
    minor: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
    pending: { bg: "bg-yellow-100 dark:bg-yellow-950", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-200 dark:border-yellow-800" },
    collected: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
    disposed: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
    completed: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
    available: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
    dispatched: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
    returning: { bg: "bg-purple-100 dark:bg-purple-950", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" },
    admitted: { bg: "bg-blue-100 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
    discharged: { bg: "bg-green-100 dark:bg-green-950", text: "text-green-700 dark:text-green-300", border: "border-green-200 dark:border-green-800" },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.inactive;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variant === "outline" ? `border ${config.border} ${config.text}` : `${config.bg} ${config.text}`
      )}
    >
      {status}
    </span>
  );
}
