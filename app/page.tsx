'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SensorData, ActuatorStatus, Alert, HistoricalData } from '@/types';
import {
  TemperatureCard,
  PHCard,
  DissolvedOxygenCard,
  ElectricalConductivityCard,
} from '@/components/SensorCard';
import AlertPanel from '@/components/AlertPanel';
import ControlPanel from '@/components/ControlPanel';
import HistoricalChart from '@/components/HistoricalChart';
import { checkWaterQuality, formatTimestamp } from '@/lib/utils';
import {
  supabase,
  DEVICE_ID,
  mapSensorRow,
  mapHistoricalRow,
  mapActuatorRow,
  sendActuatorCommand,
  fetchLatestSensorReading,
  fetchHistoricalReadings,
  fetchActuatorState,
  type SensorReadingRow,
  type ActuatorStateRow,
} from '@/lib/supabase';
import { Activity, Clock, Fish, Database, Globe } from 'lucide-react';

// ─── Error Boundary ─────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
          <div
            className="text-center p-10 rounded-2xl glass border border-red-500/20 max-w-md"
            style={{ boxShadow: '0 0 40px rgba(239,68,68,0.1)' }}
          >
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Activity className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-400 mb-6">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Defaults (used until first Supabase row arrives) ───────────────────────
const PLACEHOLDER_SENSOR: SensorData = {
  temperature: 0,
  pH: 0,
  dissolvedOxygen: 0,
  electricalConductivity: 0,
  timestamp: new Date(0),
};

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({
  title,
  accent,
}: {
  title: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-1 h-5 rounded-full"
        style={{
          background: accent ?? 'linear-gradient(to bottom, #06b6d4, #14b8a6)',
        }}
      />
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        {title}
      </h2>
    </div>
  );
}

// ─── Status Chip ─────────────────────────────────────────────────────────────
function StatusChip({
  icon: Icon,
  label,
  active,
  color,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  color?: string;
}) {
  const c = color ?? '#34d399';
  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        color: active ? c : '#64748b',
        background: active ? `${c}10` : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? `${c}25` : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {active && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: c }}
        />
      )}
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [sensorData, setSensorData] = useState<SensorData>(PLACEHOLDER_SENSOR);
  const [actuatorStatus, setActuatorStatus] = useState<ActuatorStatus>({
    aeration: false,
    waterCirculation: false,
    feeding: false,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [connected, setConnected] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Track recent alerts to dedupe (Supabase pushes can fire faster than the
  // user can dismiss; we don't want a flood of identical entries).
  const alertSeenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    // ---- 1. Initial snapshot (latest reading + history + actuator state) ----
    (async () => {
      const [latest, history, actuators] = await Promise.all([
        fetchLatestSensorReading(),
        fetchHistoricalReadings(50),
        fetchActuatorState(),
      ]);
      if (cancelled) return;
      if (latest) setSensorData(latest);
      if (history.length > 0) setHistoricalData(history);
      if (actuators) setActuatorStatus(actuators);
      setHasInitialData(true);
    })();

    // ---- 2. Realtime: new sensor_readings INSERT pushes ----
    const sensorChannel = supabase
      .channel('sensor_readings_stream')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `device_id=eq.${DEVICE_ID}`,
        },
        (payload) => {
          const row = payload.new as SensorReadingRow;
          const reading = mapSensorRow(row);
          setSensorData(reading);

          setHistoricalData((prev) => {
            const next = [...prev, mapHistoricalRow(row)];
            return next.length > 50 ? next.slice(next.length - 50) : next;
          });

          const newAlerts = checkWaterQuality(reading).filter(
            (a) => !alertSeenRef.current.has(a.message)
          );
          if (newAlerts.length > 0) {
            newAlerts.forEach((a) => alertSeenRef.current.add(a.message));
            setAlerts((prev) => [...newAlerts, ...prev].slice(0, 10));
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    // ---- 3. Realtime: actuator_state UPDATE pushes ----
    const actuatorChannel = supabase
      .channel('actuator_state_stream')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'actuator_state',
          filter: `device_id=eq.${DEVICE_ID}`,
        },
        (payload) => {
          const row = payload.new as ActuatorStateRow;
          if (row) setActuatorStatus(mapActuatorRow(row));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(sensorChannel);
      supabase.removeChannel(actuatorChannel);
    };
  }, [mounted]);

  // ─── Loading screen ────────────────────────────────────────────────────────
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-14 h-14 mx-auto mb-5">
            <div
              className="absolute inset-0 rounded-2xl animate-spin-slow"
              style={{
                background:
                  'conic-gradient(from 0deg, transparent 60%, #06b6d4 100%)',
                borderRadius: '14px',
              }}
            />
            <div className="absolute inset-[3px] rounded-xl bg-[#070d1a] flex items-center justify-center">
              <Fish className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <p className="text-sm font-medium text-slate-400">
            Initialising dashboard…
          </p>
        </div>
      </div>
    );
  }

  const handleToggleActuator = async (actuator: keyof ActuatorStatus) => {
    // Feeding is momentary: clicking the toggle fires a single feed cycle.
    // Everything else is a persistent ON/OFF flip.
    const newState =
      actuator === 'feeding' ? true : !actuatorStatus[actuator];
    try {
      await sendActuatorCommand(actuator, newState);
    } catch (err) {
      console.error('[dashboard] sendActuatorCommand failed:', err);
    }
    // Intentionally no optimistic setState -- the Supabase subscription
    // on actuator_state will push the real state once the ESP32 consumes
    // the command (~3 s latency).
  };

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      {/* Ambient background orbs */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-none select-none"
        aria-hidden
      >
        <div className="absolute -top-48 -left-48 w-[600px] h-[600px] rounded-full bg-cyan-500/[0.055] blur-[110px] animate-float-slow" />
        <div className="absolute top-1/3 -right-48 w-[700px] h-[700px] rounded-full bg-indigo-500/[0.04] blur-[130px] animate-float-medium" />
        <div className="absolute -bottom-48 left-1/4 w-[500px] h-[500px] rounded-full bg-teal-400/[0.04] blur-[100px] animate-float-medium-delay" />
      </div>

      <div className="relative min-h-screen">
        {/* ── Sticky Header ──────────────────────────────────────────────── */}
        <header className="glass-header border-b border-white/[0.05] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center justify-between gap-4">
              {/* Brand */}
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(20,184,166,0.2))',
                    border: '1px solid rgba(6,182,212,0.25)',
                    boxShadow: '0 0 16px rgba(6,182,212,0.15)',
                  }}
                >
                  <Fish className="w-4.5 h-4.5 text-cyan-400" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white leading-tight">
                    Smart Crayfish Farming
                  </h1>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    IoT Water Quality Monitoring
                  </p>
                </div>
              </div>

              {/* Status chips + clock */}
              <div className="flex items-center gap-2">
                <StatusChip
                  icon={Activity}
                  label={connected ? 'Realtime Online' : 'Connecting…'}
                  active={connected}
                  color="#34d399"
                />
                <StatusChip
                  icon={Database}
                  label={hasInitialData ? 'Sensors Active' : 'No Data'}
                  active={hasInitialData}
                  color="#06b6d4"
                />
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-slate-500"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden md:block tabular-nums">
                    {formatTimestamp(sensorData.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main ───────────────────────────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

          {/* ── Sensor Cards ─────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Live Sensor Readings" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TemperatureCard data={sensorData} />
              <PHCard data={sensorData} />
              <DissolvedOxygenCard data={sensorData} />
              <ElectricalConductivityCard data={sensorData} />
            </div>
          </section>

          {/* ── Alerts + Controls ────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Alerts & Controls" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AlertPanel alerts={alerts} onDismiss={handleDismissAlert} />
              <ControlPanel status={actuatorStatus} onToggle={handleToggleActuator} />
            </div>
          </section>

          {/* ── Historical Charts ────────────────────────────────────────── */}
          <section>
            <SectionHeader title="Historical Trends" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HistoricalChart
                data={historicalData}
                parameter="temperature"
                title="Temperature"
                unit="°C"
                color="#f97316"
              />
              <HistoricalChart
                data={historicalData}
                parameter="pH"
                title="pH Level"
                unit=""
                color="#6366f1"
              />
              <HistoricalChart
                data={historicalData}
                parameter="dissolvedOxygen"
                title="Dissolved Oxygen"
                unit="mg/L"
                color="#10b981"
              />
              <HistoricalChart
                data={historicalData}
                parameter="electricalConductivity"
                title="Electrical Conductivity"
                unit="mS/cm"
                color="#f59e0b"
              />
            </div>
          </section>

          {/* ── System Status ────────────────────────────────────────────── */}
          <section>
            <SectionHeader title="System Status" />
            <div
              className="glass rounded-2xl border border-white/[0.06] p-5"
              style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Data collection */}
                <div
                  className="flex items-start gap-3 rounded-xl p-4"
                  style={{
                    background: 'rgba(52,211,153,0.05)',
                    border: '1px solid rgba(52,211,153,0.12)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(52,211,153,0.1)' }}
                  >
                    <Database className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-slate-200">Data Collection</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Sensors updating every 5 seconds</p>
                  </div>
                </div>

                {/* Automated control */}
                <div
                  className="flex items-start gap-3 rounded-xl p-4"
                  style={{
                    background: 'rgba(6,182,212,0.05)',
                    border: '1px solid rgba(6,182,212,0.12)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(6,182,212,0.1)' }}
                  >
                    <Activity className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-slate-200">Auto Control</span>
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded-full">
                        ENABLED
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Actuators responding to sensor data</p>
                  </div>
                </div>

                {/* Remote access */}
                <div
                  className="flex items-start gap-3 rounded-xl p-4"
                  style={{
                    background: 'rgba(139,92,246,0.05)',
                    border: '1px solid rgba(139,92,246,0.12)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.1)' }}
                  >
                    <Globe className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-semibold text-slate-200">Remote Access</span>
                      <span className="text-[10px] font-bold text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-full">
                        ONLINE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">Dashboard accessible remotely</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="flex items-center justify-between pt-2 pb-6 border-t border-white/[0.04]">
            <p className="text-[11px] text-slate-700">
              Smart Crayfish Farming System · IoT Dashboard
            </p>
            <p className="text-[11px] text-slate-700">
              Toshiba Prototype · {new Date().getFullYear()}
            </p>
          </footer>
        </main>
      </div>
    </ErrorBoundary>
  );
}
