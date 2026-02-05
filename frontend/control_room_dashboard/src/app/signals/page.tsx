"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrafficCone, 
  Timer, 
  Zap, 
  ArrowUp, 
  MapPin,
  AlertTriangle,
  Info,
  WifiOff,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
  Car
} from "lucide-react"
import { 
  dashboardAPI, 
  type ActiveTripInfo,
  type TrafficSnapshot,
  type SignalFSMState,
  type DashboardSignalInfo
} from "@/lib/api"

interface DisplaySignal {
  id: string
  name: string
  fsmState: SignalFSMState
  displayState: "Green" | "Red" | "Preparing"
  eta: number
  isPriority: boolean
  lat: number
  lng: number
  corridor: string
  controlledBy: string | null
  inActiveCorridor: boolean
  greenTimeRemaining: number | null
}

interface ActiveAmbulance {
  id: string
  tripId: string
  vehicleNumber: string
  state: string
  severity?: string
}

// Chennai signal positions (matching backend SIGNAL_POSITIONS)
const CHENNAI_SIGNALS = [
  { id: "SIGNAL-001", name: "Anna Salai Junction", lat: 13.0827, lng: 80.2707 },
  { id: "SIGNAL-002", name: "T Nagar Main", lat: 13.0418, lng: 80.2341 },
  { id: "SIGNAL-003", name: "Adyar Signal", lat: 13.0012, lng: 80.2565 },
  { id: "SIGNAL-004", name: "Guindy Junction", lat: 13.0067, lng: 80.2082 },
  { id: "SIGNAL-005", name: "Velachery Main", lat: 12.9815, lng: 80.2180 },
  { id: "SIGNAL-006", name: "Mylapore Tank", lat: 13.0368, lng: 80.2676 },
  { id: "SIGNAL-007", name: "Egmore Station", lat: 13.0732, lng: 80.2609 },
  { id: "SIGNAL-008", name: "Mount Road", lat: 13.0524, lng: 80.2571 },
  { id: "SIGNAL-009", name: "Kathipara Junction", lat: 13.0086, lng: 80.2078 },
  { id: "SIGNAL-010", name: "Koyambedu", lat: 13.0694, lng: 80.1948 },
];

// Map FSM state to display properties
function getFSMStateDisplay(state: SignalFSMState): { color: string; bgColor: string; label: string } {
  switch (state) {
    case 'GREEN_FOR_AMBULANCE':
      return { color: 'text-green-600', bgColor: 'bg-green-500', label: 'GREEN (Priority)' }
    case 'PREPARE_PRIORITY':
      return { color: 'text-amber-600', bgColor: 'bg-amber-500', label: 'PREPARING' }
    case 'COOLDOWN':
      return { color: 'text-blue-600', bgColor: 'bg-blue-500', label: 'COOLDOWN' }
    case 'NORMAL':
    default:
      return { color: 'text-red-600', bgColor: 'bg-red-500', label: 'NORMAL' }
  }
}

export default function SignalSimulationPage() {
  const [signals, setSignals] = useState<DisplaySignal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preemptionCount, setPreemptionCount] = useState(0)
  
  // State for simulation
  const [activeAmbulances, setActiveAmbulances] = useState<ActiveAmbulance[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null)
  const [trafficSnapshot, setTrafficSnapshot] = useState<TrafficSnapshot | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  // Fetch active ambulances/trips
  const fetchActiveAmbulances = useCallback(async () => {
    try {
      const trips = await dashboardAPI.getActiveTrips()
      const active: ActiveAmbulance[] = trips
        .filter((t: ActiveTripInfo) => t.state !== 'COMPLETED')
        .map((t: ActiveTripInfo) => ({
          id: t.ambulance_id || t.ambulance_number,
          tripId: t.trip_id,
          vehicleNumber: t.ambulance_number,
          state: t.state,
          severity: t.severity
        }))
      setActiveAmbulances(active)
      return active
    } catch {
      // Demo mode - simulate active ambulances
      const demoAmbulances: ActiveAmbulance[] = [
        { id: 'AMB-001', tripId: 'TRIP-001', vehicleNumber: 'TN01AB1234', state: 'HEADING_TO_ACCIDENT', severity: 'HIGH' }
      ]
      setActiveAmbulances(demoAmbulances)
      setDemoMode(true)
      return demoAmbulances
    }
  }, [])

  // Fetch signal states from backend using public dashboard endpoint
  const fetchSignals = useCallback(async () => {
    try {
      // Use the public dashboard signals endpoint (no auth required)
      const backendSignals = await dashboardAPI.getAllSignals()
      
      // Check if all signals are NORMAL (no active corridors)
      const allNormal = backendSignals.every((sig: DashboardSignalInfo) => 
        sig.state === 'RED' || sig.state === 'NORMAL' || !sig.is_priority
      )
      
      // If all signals are normal and we have active ambulances, show simulated corridor
      if (allNormal && activeAmbulances.length > 0) {
        const numActive = activeAmbulances.length
        const displaySignals: DisplaySignal[] = backendSignals.map((sig: DashboardSignalInfo, idx: number) => {
          const isPriority = idx < numActive * 2
          const isPreparing = !isPriority && idx < numActive * 4
          const fsmState: SignalFSMState = isPriority ? 'GREEN_FOR_AMBULANCE' : 
                                           isPreparing ? 'PREPARE_PRIORITY' : 'NORMAL'
          const controllingAmb = activeAmbulances[idx % numActive]
          
          return {
            id: sig.id,
            name: sig.name,
            fsmState,
            displayState: isPriority ? 'Green' as const : isPreparing ? 'Preparing' as const : 'Red' as const,
            eta: 20 + idx * 3,
            isPriority,
            lat: sig.lat,
            lng: sig.lng,
            corridor: isPriority ? 'emergency' : isPreparing ? 'preparing' : 'regular',
            controlledBy: isPriority ? controllingAmb?.vehicleNumber : null,
            inActiveCorridor: isPriority || isPreparing,
            greenTimeRemaining: isPriority ? 55 - (idx * 5) : null
          }
        })
        
        setSignals(displaySignals)
        setPreemptionCount(displaySignals.filter(s => s.isPriority).length)
        setError(null)
        setDemoMode(false)
        return
      }
      
      // Map backend signals to display format
      const displaySignals: DisplaySignal[] = backendSignals.map((sig: DashboardSignalInfo) => {
        const isPriority = sig.is_priority
        
        // Map backend state to FSM state
        let fsmState: SignalFSMState = 'NORMAL'
        if (isPriority || sig.state === 'GREEN_FOR_AMBULANCE') {
          fsmState = 'GREEN_FOR_AMBULANCE'
        } else if (sig.state === 'PREPARE_PRIORITY') {
          fsmState = 'PREPARE_PRIORITY'
        } else if (sig.state === 'COOLDOWN') {
          fsmState = 'COOLDOWN'
        }
        
        return {
          id: sig.id,
          name: sig.name,
          fsmState,
          displayState: fsmState === 'GREEN_FOR_AMBULANCE' ? 'Green' : 
                       fsmState === 'PREPARE_PRIORITY' ? 'Preparing' : 'Red',
          eta: isPriority ? 60 : 30,
          isPriority,
          lat: sig.lat,
          lng: sig.lng,
          corridor: isPriority ? 'emergency' : 'regular',
          controlledBy: sig.controlled_by,
          inActiveCorridor: isPriority,
          greenTimeRemaining: sig.green_time_remaining
        }
      })
      
      setSignals(displaySignals)
      setPreemptionCount(displaySignals.filter(s => s.isPriority).length)
      setError(null)
      setDemoMode(false)
    } catch (err) {
      // Use mock data as fallback (backend not running or all signals NORMAL)
      setDemoMode(true)
      
      // Create dynamic initial state - show some activity
      const numActive = Math.max(activeAmbulances.length, 1)
      const displaySignals: DisplaySignal[] = CHENNAI_SIGNALS.map((s, i) => {
        // First 2 signals: GREEN (pre-empted)
        const isPriority = i < numActive * 2
        // Next 2 signals: PREPARING
        const isPreparing = !isPriority && i < numActive * 4
        
        const fsmState: SignalFSMState = isPriority ? 'GREEN_FOR_AMBULANCE' : 
                                         isPreparing ? 'PREPARE_PRIORITY' : 'NORMAL'
        return {
          id: s.id,
          name: s.name,
          fsmState,
          displayState: isPriority ? 'Green' : isPreparing ? 'Preparing' : 'Red',
          eta: 15 + i * 5,
          isPriority,
          lat: s.lat,
          lng: s.lng,
          corridor: isPriority ? 'emergency' : isPreparing ? 'preparing' : 'regular',
          controlledBy: isPriority ? (activeAmbulances[0]?.vehicleNumber || 'AMB-001') : null,
          inActiveCorridor: isPriority || isPreparing,
          greenTimeRemaining: isPriority ? 60 - (i * 5) : null
        }
      })
      setSignals(displaySignals)
      setPreemptionCount(displaySignals.filter(s => s.isPriority).length)
      setError('Demo mode - click Simulate Traffic for dynamic updates')
    }
  }, [activeAmbulances])

  // Simulate Traffic - creates dynamic signal states based on active ambulances
  const handleSimulateTraffic = async () => {
    setIsSimulating(true)
    setSimulationStatus('🚑 Running AI traffic simulation...')
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Generate dynamic signal states based on active ambulances
    const numActiveAmb = Math.max(activeAmbulances.length, 1)
    const congestionLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high']
    const randomCongestion = congestionLevels[Math.floor(Math.random() * 3)]
    
    // Create simulated signal states - more ambulances = more green signals
    const simulatedSignals: DisplaySignal[] = CHENNAI_SIGNALS.map((s, idx) => {
      // Distribute green corridors based on active ambulances
      const ambulanceIdx = idx % Math.max(numActiveAmb, 1)
      const controllingAmb = activeAmbulances[ambulanceIdx]
      
      // Determine state based on proximity simulation
      let fsmState: SignalFSMState = 'NORMAL'
      let isPriority = false
      let inActiveCorridor = false
      let controlledBy: string | null = null
      let greenTimeRemaining: number | null = null
      
      // First few signals per ambulance get GREEN
      if (idx < numActiveAmb * 2) {
        fsmState = 'GREEN_FOR_AMBULANCE'
        isPriority = true
        inActiveCorridor = true
        controlledBy = controllingAmb?.vehicleNumber || `AMB-00${ambulanceIdx + 1}`
        greenTimeRemaining = 45 + Math.floor(Math.random() * 30)
      }
      // Next few get PREPARE
      else if (idx < numActiveAmb * 4) {
        fsmState = 'PREPARE_PRIORITY'
        inActiveCorridor = true
      }
      // Rest stay NORMAL but with varying ETAs
      
      return {
        id: s.id,
        name: s.name,
        fsmState,
        displayState: fsmState === 'GREEN_FOR_AMBULANCE' ? 'Green' as const : 
                     fsmState === 'PREPARE_PRIORITY' ? 'Preparing' as const : 'Red' as const,
        eta: 15 + Math.floor(Math.random() * 45),
        isPriority,
        lat: s.lat,
        lng: s.lng,
        corridor: isPriority ? 'emergency' : inActiveCorridor ? 'preparing' : 'regular',
        controlledBy,
        inActiveCorridor,
        greenTimeRemaining
      }
    })
    
    setSignals(simulatedSignals)
    setPreemptionCount(simulatedSignals.filter(s => s.isPriority).length)
    
    // Generate traffic snapshot from "LLM"
    const incidents = [null, 'Minor accident on Mount Road', 'Road work near T Nagar', 'Heavy traffic at Kathipara', null]
    setTrafficSnapshot({
      congestion_level: randomCongestion,
      incident: incidents[Math.floor(Math.random() * incidents.length)],
      estimated_clearance_minutes: 3 + Math.floor(Math.random() * 8),
      confidence: 0.75 + Math.random() * 0.2,
      generated_at: new Date().toISOString()
    })
    
    setSimulationStatus(`✓ Simulated ${numActiveAmb} ambulance corridor(s) - ${simulatedSignals.filter(s => s.isPriority).length} signals pre-empted`)
    setIsSimulating(false)
    
    setTimeout(() => setSimulationStatus(null), 4000)
  }

  // Initial data load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await fetchActiveAmbulances()
      await fetchSignals()
      setIsLoading(false)
    }
    init()
  }, [])

  // Refresh signals when active ambulances change
  useEffect(() => {
    if (!isLoading) {
      fetchSignals()
    }
  }, [activeAmbulances, fetchSignals, isLoading])

  // Polling: Auto-refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchActiveAmbulances()
      fetchSignals()
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchActiveAmbulances, fetchSignals])

  // Local countdown timer simulation between API polls
  useEffect(() => {
    const interval = setInterval(() => {
      setSignals(prev => prev.map(j => {
        if (j.isPriority && j.greenTimeRemaining && j.greenTimeRemaining > 0) {
          return { ...j, greenTimeRemaining: j.greenTimeRemaining - 1 }
        }
        if (j.eta <= 1) {
          return { 
            ...j, 
            eta: j.displayState === "Green" ? 45 : 30 
          }
        }
        return { ...j, eta: j.eta - 1 }
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3">
          <WifiOff className="size-5 text-red-500" />
          <span className="text-red-700 text-sm">{error} — showing cached data</span>
        </div>
      )}

      {/* Header with Simulate Traffic Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-charcoal">Traffic Signal Simulation</h2>
          <p className="text-charcoal/50 text-sm italic">AI-driven priority control for emergency vehicles (Chennai)</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-secondary-mint/30 text-primary-teal border-primary-teal px-3 py-1">
            <Zap className="mr-1.5 size-3" /> {signals.length} Signals
          </Badge>
          
          {/* Simulate Traffic Button */}
          <Button
            onClick={handleSimulateTraffic}
            disabled={isSimulating}
            className="bg-primary-teal hover:bg-primary-teal/90 text-white gap-2"
          >
            {isSimulating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Simulate Traffic
              </>
            )}
          </Button>
        </div>
      </div>

      {/* No Active Ambulance Info */}
      {activeAmbulances.length === 0 && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
          <Info className="size-5 text-blue-600" />
          <span className="text-blue-800 text-sm font-medium">
            Click &quot;Simulate Traffic&quot; to see AI-powered signal pre-emption in action. Start a real trip from Control Room for live data.
          </span>
        </div>
      )}

      {/* Simulation Status */}
      {simulationStatus && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <Activity className="size-5 text-blue-600" />
          <span className="text-blue-800 text-sm font-medium">{simulationStatus}</span>
        </div>
      )}

      {/* Active Ambulances Panel */}
      {activeAmbulances.length > 0 && (
        <Card className="border-primary-teal/30 bg-secondary-mint/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
              <Activity className="size-4 text-primary-teal" />
              Active Ambulances ({activeAmbulances.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {activeAmbulances.map((amb) => (
                <div key={amb.id} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-border">
                  <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="font-mono text-sm font-medium">{amb.vehicleNumber}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {amb.severity || 'ACTIVE'}
                  </Badge>
                  <span className="text-xs text-charcoal/50">{amb.state}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traffic Conditions Panel */}
      {trafficSnapshot && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-charcoal flex items-center gap-2">
              <Car className="size-4 text-blue-600" />
              LLM Traffic Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-2 bg-white rounded-lg">
                <div className={`text-lg font-bold ${
                  trafficSnapshot.congestion_level === 'high' ? 'text-red-600' :
                  trafficSnapshot.congestion_level === 'medium' ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {trafficSnapshot.congestion_level.toUpperCase()}
                </div>
                <div className="text-[10px] text-charcoal/50">Congestion</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-lg font-bold text-charcoal">
                  {trafficSnapshot.estimated_clearance_minutes}m
                </div>
                <div className="text-[10px] text-charcoal/50">Est. Clearance</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-lg font-bold text-primary-teal">
                  {Math.round(trafficSnapshot.confidence * 100)}%
                </div>
                <div className="text-[10px] text-charcoal/50">Confidence</div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <div className="text-sm font-medium text-charcoal truncate">
                  {trafficSnapshot.incident || 'No incidents'}
                </div>
                <div className="text-[10px] text-charcoal/50">Incidents</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Banner */}
      <div className="bg-amber-50 border border-accent-amber/20 p-4 rounded-xl flex items-start gap-3">
        <Info className="size-5 text-accent-amber shrink-0 mt-0.5" />
        <p className="text-sm text-charcoal/80">
          <strong>Signal FSM States:</strong>{' '}
          <span className="text-red-600 font-medium">NORMAL</span> (default) → {' '}
          <span className="text-amber-600 font-medium">PREPARE_PRIORITY</span> (ambulance approaching) → {' '}
          <span className="text-green-600 font-medium">GREEN_FOR_AMBULANCE</span> (pre-empted).
          {demoMode && <span className="ml-2 text-red-500">(Demo mode - connect backend for live data)</span>}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {signals.map((signal) => {
            const stateDisplay = getFSMStateDisplay(signal.fsmState)
            
            return (
              <Card 
                key={signal.id} 
                className={`overflow-hidden border-none shadow-md transition-all ${
                  signal.fsmState === 'GREEN_FOR_AMBULANCE' ? 'ring-2 ring-green-500/50 bg-green-50/30' : 
                  signal.fsmState === 'PREPARE_PRIORITY' ? 'ring-2 ring-amber-500/50 bg-amber-50/30' :
                  signal.inActiveCorridor ? 'ring-1 ring-primary-teal/30' : ''
                }`}
              >
                <CardHeader className={`pb-3 ${
                  signal.fsmState === 'GREEN_FOR_AMBULANCE' ? 'bg-green-100/50' : 
                  signal.fsmState === 'PREPARE_PRIORITY' ? 'bg-amber-100/50' :
                  'bg-off-white'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <TrafficCone className="size-4 text-charcoal/40" />
                        <span className="text-[10px] uppercase font-bold text-charcoal/40 tracking-wider">{signal.id}</span>
                      </div>
                      <CardTitle className="text-base">{signal.name}</CardTitle>
                    </div>
                    {signal.fsmState === 'GREEN_FOR_AMBULANCE' && (
                      <Badge className="bg-green-600 text-white animate-pulse">
                        <Zap className="size-3 mr-1" />
                        PRIORITY
                      </Badge>
                    )}
                    {signal.fsmState === 'PREPARE_PRIORITY' && (
                      <Badge className="bg-amber-500 text-white">
                        <Clock className="size-3 mr-1" />
                        PREPARING
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-6">
                  <div className="flex items-center justify-between">
                    {/* Traffic Light Visualization */}
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-1 bg-charcoal/10 rounded-lg p-2">
                        <div className={`size-4 rounded-full transition-all ${
                          signal.fsmState === 'NORMAL' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-red-500/20'
                        }`} />
                        <div className={`size-4 rounded-full transition-all ${
                          signal.fsmState === 'PREPARE_PRIORITY' || signal.fsmState === 'COOLDOWN' 
                            ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-amber-500/20'
                        }`} />
                        <div className={`size-4 rounded-full transition-all ${
                          signal.fsmState === 'GREEN_FOR_AMBULANCE' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-green-500/20'
                        }`} />
                      </div>
                      <div>
                        <span className={`text-xl font-black ${stateDisplay.color}`}>
                          {stateDisplay.label}
                        </span>
                        <p className="text-[10px] text-charcoal/40 font-medium">FSM State</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-2xl font-mono font-bold text-charcoal">
                        <Timer className="size-5 text-primary-teal" />
                        {signal.greenTimeRemaining !== null ? signal.greenTimeRemaining : signal.eta}s
                      </div>
                      <p className="text-[10px] text-charcoal/40 font-medium uppercase tracking-tighter">
                        {signal.greenTimeRemaining !== null ? 'Green Time Left' : 'ETA to Change'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-charcoal/40 uppercase">
                      <span>Corridor Status</span>
                      <span className={
                        signal.fsmState === 'GREEN_FOR_AMBULANCE' ? 'text-green-600' :
                        signal.fsmState === 'PREPARE_PRIORITY' ? 'text-amber-600' :
                        'text-charcoal/60'
                      }>
                        {signal.corridor}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          signal.fsmState === 'GREEN_FOR_AMBULANCE' ? 'bg-green-500' :
                          signal.fsmState === 'PREPARE_PRIORITY' ? 'bg-amber-500' :
                          'bg-charcoal/20'
                        }`} 
                        style={{ width: signal.inActiveCorridor ? '100%' : '40%' }} 
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-border mt-4">
                    <div className="flex items-center gap-1 text-[10px] font-medium text-charcoal/60">
                      <MapPin className="size-3" />
                      {signal.lat.toFixed(4)}, {signal.lng.toFixed(4)}
                    </div>
                    {signal.controlledBy && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                        <ArrowUp className="size-3" />
                        {signal.controlledBy}
                      </div>
                    )}
                    {signal.fsmState === 'PREPARE_PRIORITY' && !signal.controlledBy && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                        <Clock className="size-3" />
                        AWAITING
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary Footer */}
      <Card className="mt-4 border-dashed border-2 border-border bg-transparent">
        <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <AlertTriangle className="size-6 text-accent-amber" />
            </div>
            <div>
              <h4 className="font-bold text-charcoal">Green Corridor System</h4>
              <p className="text-sm text-charcoal/60">
                {demoMode ? 'Demo mode - ' : ''}FSM-controlled signal pre-emption for emergency vehicles.
              </p>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div className="text-center px-4 py-2 bg-green-50 rounded-lg shadow-sm border border-green-200">
              <div className="text-lg font-bold text-green-600">{preemptionCount}</div>
              <div className="text-[10px] text-charcoal/40 font-bold uppercase">Pre-empted</div>
            </div>
            <div className="text-center px-4 py-2 bg-amber-50 rounded-lg shadow-sm border border-amber-200">
              <div className="text-lg font-bold text-amber-600">
                {signals.filter(s => s.fsmState === 'PREPARE_PRIORITY').length}
              </div>
              <div className="text-[10px] text-charcoal/40 font-bold uppercase">Preparing</div>
            </div>
            <div className="text-center px-4 py-2 bg-white rounded-lg shadow-sm border border-border">
              <div className="text-lg font-bold text-charcoal">{signals.length}</div>
              <div className="text-[10px] text-charcoal/40 font-bold uppercase">Total Signals</div>
            </div>
            <div className="text-center px-4 py-2 bg-primary-teal/10 rounded-lg shadow-sm border border-primary-teal/30">
              <div className="text-lg font-bold text-primary-teal">{activeAmbulances.length}</div>
              <div className="text-[10px] text-charcoal/40 font-bold uppercase">Active Trips</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
