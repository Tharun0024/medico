import type { Metadata } from "next";
import "./globals.css";
import VisualEditsMessenger from "../visual-edits/VisualEditsMessenger";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { DemoBanner } from "@/components/demo-banner";

export const metadata: Metadata = {
  title: "MEDICO | Smart Hospital Management System",
  description: "AI-driven Hospital Coordination and Emergency Orchestration System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="a836e496-ccc0-4733-ad14-4ed50699c534"
        />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "MEDICO", "version": "2.0.0"}'
        />
        <ThemeProvider defaultTheme="light" storageKey="hospital-theme">
          <Providers>
            {children}
            <DemoBanner />
          </Providers>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
