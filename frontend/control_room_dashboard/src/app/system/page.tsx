"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, Lock, AlertTriangle, Radio } from "lucide-react";
import { systemAPI, authAPI, setAuthToken, type SystemStatus, type ConflictLog } from "@/lib/api";

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Login form state
  const [ambulanceId, setAmbulanceId] = useState("AMB_001");
  const [secret, setSecret] = useState("sec-amb-001");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const data = await systemAPI.getStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch system status");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchStatus, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    try {
      const result = await authAPI.register(ambulanceId, secret);
      setAuthToken(result.access_token);
      setIsAuthenticated(true);
      setIsLoading(true);
    } catch (err) {
      setError("Login failed. Check credentials.");
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-charcoal mb-6">
            Authenticate to View System Status
          </h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-1">
                Ambulance ID
              </label>
              <input
                type="text"
                value={ambulanceId}
                onChange={(e) => setAmbulanceId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal"
                placeholder="AMB_001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal/70 mb-1">
                Secret
              </label>
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-teal"
                placeholder="sec-amb-001"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-primary-teal text-white py-2 rounded-lg hover:bg-primary-teal/90 disabled:opacity-50"
            >
              {isLoggingIn ? "Authenticating..." : "Login"}
            </button>
          </form>
          <p className="text-xs text-charcoal/50 mt-4">
            Demo: AMB_001 / sec-amb-001
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="size-8 animate-spin text-primary-teal" />
        <span className="ml-2 text-lg">Loading system status...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-charcoal">System Status</h2>
          <p className="text-charcoal/50 text-sm">
            Multi-ambulance conflict resolution & resource locking
          </p>
        </div>
        <button
          onClick={fetchStatus}
          className="flex items-center gap-2 px-4 py-2 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="size-6" />}
          label="Active Ambulances"
          value={status?.active_ambulances.length || 0}
          color="bg-green-500"
        />
        <StatCard
          icon={<Lock className="size-6" />}
          label="Locked Resources"
          value={Object.keys(status?.locked_resources || {}).length}
          color="bg-blue-500"
        />
        <StatCard
          icon={<AlertTriangle className="size-6" />}
          label="Suppressed"
          value={status?.suppressed_ambulances.length || 0}
          color="bg-orange-500"
        />
        <StatCard
          icon={<Radio className="size-6" />}
          label="Recent Decisions"
          value={status?.log_preview.length || 0}
          color="bg-purple-500"
        />
      </div>

      {/* Active Ambulances */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-charcoal mb-4">
          Active Ambulances
        </h3>
        <div className="flex flex-wrap gap-2">
          {status?.active_ambulances.map((amb) => (
            <span
              key={amb}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                status.suppressed_ambulances.includes(amb)
                  ? "bg-orange-100 text-orange-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {amb}
              {status.suppressed_ambulances.includes(amb) && " (suppressed)"}
            </span>
          ))}
          {(!status?.active_ambulances.length) && (
            <p className="text-charcoal/50">No active ambulances</p>
          )}
        </div>
      </div>

      {/* Locked Resources */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-charcoal mb-4">
          Locked Resources (Signal Preemption)
        </h3>
        {Object.keys(status?.locked_resources || {}).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(status?.locked_resources || {}).map(([resource, owner]) => (
              <div
                key={resource}
                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
              >
                <span className="font-medium text-charcoal">{resource}</span>
                <span className="text-blue-600 text-sm">→ {owner}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-charcoal/50">No resources currently locked</p>
        )}
      </div>

      {/* Decision Log */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-charcoal mb-4">
          Recent Conflict Decisions
        </h3>
        {status?.log_preview.length ? (
          <div className="space-y-2">
            {status.log_preview.map((log, i) => (
              <LogEntry key={i} log={log} />
            ))}
          </div>
        ) : (
          <p className="text-charcoal/50">No conflict decisions yet</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg text-white ${color}`}>{icon}</div>
        <div>
          <p className="text-2xl font-bold text-charcoal">{value}</p>
          <p className="text-sm text-charcoal/60">{label}</p>
        </div>
      </div>
    </div>
  );
}

function LogEntry({ log }: { log: ConflictLog }) {
  return (
    <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <span className="font-medium text-charcoal">{log.resource}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600 font-medium">Winner: {log.winner}</span>
        {log.losers && log.losers.length > 0 && (
          <span className="text-red-500 text-sm">
            | Losers: {log.losers.join(", ")}
          </span>
        )}
      </div>
    </div>
  );
}
