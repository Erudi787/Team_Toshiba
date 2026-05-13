'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  SensorData,
  ActuatorStatus,
  Alert,
  HistoricalData,
  SystemEvent,
  DeviceSettings,
  HistoricalRangeKey,
  HISTORICAL_RANGES,
} from '@/types';
import {
  TemperatureCard,
  PHCard,
  DissolvedOxygenCard,
  ElectricalConductivityCard,
} from '@/components/SensorCard';
import AlertPanel from '@/components/AlertPanel';
import ControlPanel, { type FeedScheduleUi } from '@/components/ControlPanel';
import HistoricalChart from '@/components/HistoricalChart';
import RecentActivity from '@/components/RecentActivity';
import { checkWaterQuality, formatTimestamp } from '@/lib/utils';
import {
  supabase,
  DEVICE_ID,
  mapSensorRow,
  mapHistoricalRow,
  mapActuatorRow,
  mapAlertRow,
  mapDeviceSettingsRow,
  sendActuatorCommand,
  fetchLatestSensorReading,
  fetchHistoricalReadingsByRange,
  fetchActuatorState,
  fetchRecentAlerts,
  fetchDeviceSettings,
  updateFeedInterval,
  type SensorReadingRow,
  type ActuatorStateRow,
  type AlertRow,
  type DeviceSettingsRow,
  type ToggleableActuator,
} from '@/lib/supabase';
import { Activity, Clock, Fish, Database } from 'lucide-react';

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

// ─── Time-range picker (Historical Trends) ──────────────────────────────────
// Compact pill row with the supported ranges. Visually mirrors the
// FeedSchedule preset chips so the dashboard feels consistent.
function TimeRangePicker({
  value,
  onChange,
}: {
  value: HistoricalRangeKey;
  onChange: (k: HistoricalRangeKey) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {HISTORICAL_RANGES.map((r) => {
        const selected = r.key === value;
        return (
          <button
            key={r.key}
            onClick={() => onChange(r.key)}
            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 focus:outline-none"
            style={{
              background: selected
                ? 'rgba(6,182,212,0.18)'
                : 'rgba(255,255,255,0.03)',
              color: selected ? '#67e8f9' : '#94a3b8',
              border: `1px solid ${
                selected ? 'rgba(6,182,212,0.35)' : 'rgba(255,255,255,0.06)'
              }`,
            }}
            aria-pressed={selected}
          >
            {r.key}
          </button>
        );
      })}
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
    light: false,
    lastFeedAt: null,
    feedCountToday: 0,
    feedIntervalMinutesActive: null,
  });
  const [deviceSettings, setDeviceSettings] = useState<DeviceSettings | null>(null);
  const [scheduleUi, setScheduleUi] = useState<FeedScheduleUi>({});
  const [historicalRange, setHistoricalRange] = useState<HistoricalRangeKey>('1h');
  const [recentEvents, setRecentEvents] = useState<SystemEvent[]>([]);

  // Per-actuator UI feedback for the toggles. `pending` = command in flight.
  //   pending.sentOk=false: still trying to insert into Supabase
  //   pending.sentOk=true:  Supabase row inserted, waiting for ESP32 to ack
  // `error` = either send failed or ESP32 didn't ack within the timeout.
  // The distinction matters for messaging -- sentOk=true means the command
  // was delivered and the action probably happened on the device, but the
  // confirmation upload from the device failed (very common with weak WiFi).
  const [actuatorUi, setActuatorUi] = useState<
    Record<
      ToggleableActuator,
      {
        pending?: { expected: boolean; expectedFeedCount?: number; sentOk: boolean };
        error?: string;
      }
    >
  >({
    aeration: {},
    waterCirculation: {},
    feeding: {},
    light: {},
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

    // ---- 1. Initial snapshot (everything *except* history) ----
    // History is fetched in a separate effect that re-runs when the user
    // picks a different time range. Splitting them keeps the dependency
    // array clean and avoids re-establishing realtime subscriptions on a
    // range change.
    (async () => {
      const [latest, actuators, events, settings] = await Promise.all([
        fetchLatestSensorReading(),
        fetchActuatorState(),
        fetchRecentAlerts(10),
        fetchDeviceSettings(),
      ]);
      if (cancelled) return;
      if (latest) setSensorData(latest);
      if (actuators) setActuatorStatus(actuators);
      setRecentEvents(events);
      if (settings) setDeviceSettings(settings);
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
            // Cap to the same max we use for fetchHistoricalReadingsByRange()
            // so the in-memory buffer can't grow unbounded across long sessions.
            return next.length > 2000 ? next.slice(next.length - 2000) : next;
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

    // ---- 4. Realtime: alerts INSERT pushes (system events) ----
    const alertsChannel = supabase
      .channel('alerts_stream')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `device_id=eq.${DEVICE_ID}`,
        },
        (payload) => {
          const row = payload.new as AlertRow;
          const event = mapAlertRow(row);
          setRecentEvents((prev) => [event, ...prev].slice(0, 10));
          // Parallel confirmation path: a "Feed #N dispensed" alert
          // proves the feed fired even if the actuator_state upsert
          // failed. Clear any pending feeding spinner immediately.
          if (event.parameter === 'feeding') {
            setActuatorUi((prev) =>
              prev.feeding.pending ? { ...prev, feeding: {} } : prev
            );
          }
        }
      )
      .subscribe();

    // ---- 5. Realtime: device_settings UPDATE pushes ----
    // So when the operator changes the feed interval from another tab/device,
    // every open dashboard reflects the new value immediately.
    const settingsChannel = supabase
      .channel('device_settings_stream')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'device_settings',
          filter: `device_id=eq.${DEVICE_ID}`,
        },
        (payload) => {
          const row = payload.new as DeviceSettingsRow;
          if (row) setDeviceSettings(mapDeviceSettingsRow(row));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(sensorChannel);
      supabase.removeChannel(actuatorChannel);
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(settingsChannel);
    };
  }, [mounted]);

  // ─── History fetch (re-runs on range change) ───────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const rangeMinutes =
      HISTORICAL_RANGES.find((r) => r.key === historicalRange)?.minutes ?? 60;
    (async () => {
      const history = await fetchHistoricalReadingsByRange(rangeMinutes);
      if (cancelled) return;
      // Replace, don't merge -- the previous range's data points may sit
      // outside the new window and would be misleading on the chart.
      setHistoricalData(history);
    })();
    return () => {
      cancelled = true;
    };
  }, [mounted, historicalRange]);

  // Clear pending markers when the actuator state arrives matching what
  // we asked for. For aeration/light/waterCirculation we compare boolean
  // state; for feeding we watch feedCountToday increment.
  useEffect(() => {
    setActuatorUi((prev) => {
      let changed = false;
      const next = { ...prev };
      const togglable: ToggleableActuator[] = [
        'aeration',
        'waterCirculation',
        'light',
      ];
      for (const key of togglable) {
        const p = next[key].pending;
        if (p && actuatorStatus[key] === p.expected) {
          next[key] = {};
          changed = true;
        }
      }
      const feedPending = next.feeding.pending;
      if (
        feedPending &&
        feedPending.expectedFeedCount !== undefined &&
        actuatorStatus.feedCountToday >= feedPending.expectedFeedCount
      ) {
        next.feeding = {};
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [actuatorStatus]);

  // If a pending toggle isn't acknowledged within 15s, mark it as an
  // error. The error message depends on whether the dashboard actually
  // managed to send the command -- "send failed" vs "command delivered
  // but device didn't confirm back" are very different problems.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    (Object.keys(actuatorUi) as ToggleableActuator[]).forEach((key) => {
      const pending = actuatorUi[key].pending;
      if (!pending) return;
      const t = setTimeout(() => {
        setActuatorUi((prev) => {
          const p = prev[key].pending;
          if (!p) return prev;
          const errorMsg = p.sentOk
            ? key === 'feeding'
              ? 'Sent — feeder may have fired but device didn\'t confirm'
              : 'Sent — device didn\'t confirm new state'
            : 'Could not reach Supabase';
          return { ...prev, [key]: { error: errorMsg } };
        });
        // Auto-clear that error after 6s
        setTimeout(() => {
          setActuatorUi((prev) =>
            prev[key].error
              ? { ...prev, [key]: {} }
              : prev
          );
        }, 6000);
      }, 15000);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [actuatorUi]);

  // Clear the scheduleUi pending marker once device_settings catches up
  // with what we wrote. This is the "save confirmed" moment from the
  // user's perspective; the separate "applying" badge stays on until the
  // firmware reports back via actuator_state.feed_interval_minutes.
  // MUST sit above the !mounted early return -- moving it below changes
  // the hook count between first render and subsequent renders, which
  // trips React error #310.
  useEffect(() => {
    if (
      scheduleUi.pendingValue != null &&
      deviceSettings?.feedIntervalMinutes === scheduleUi.pendingValue
    ) {
      setScheduleUi({});
    }
  }, [deviceSettings?.feedIntervalMinutes, scheduleUi.pendingValue]);

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

  const handleToggleActuator = async (actuator: ToggleableActuator) => {
    // Feeding is momentary: clicking the toggle fires a single feed cycle.
    // Everything else is a persistent ON/OFF flip.
    const newState =
      actuator === 'feeding' ? true : !actuatorStatus[actuator];

    // Mark as pending. For feeding we track the expected feed count
    // so we know when the device acks (count increment).
    setActuatorUi((prev) => ({
      ...prev,
      [actuator]: {
        pending: {
          expected: newState,
          expectedFeedCount:
            actuator === 'feeding'
              ? actuatorStatus.feedCountToday + 1
              : undefined,
          sentOk: false,
        },
      },
    }));

    try {
      await sendActuatorCommand(actuator, newState);
      // Send went through to Supabase. Now waiting for ESP32 to poll +
      // execute + upsert. Mark sentOk so the timeout error message can
      // differentiate "send failed" from "device didn't confirm".
      setActuatorUi((prev) => {
        const cur = prev[actuator].pending;
        if (!cur) return prev; // already cleared
        return {
          ...prev,
          [actuator]: { pending: { ...cur, sentOk: true } },
        };
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      console.error('[dashboard] sendActuatorCommand failed:', err);
      setActuatorUi((prev) => ({
        ...prev,
        [actuator]: { error: `Couldn't send: ${msg}` },
      }));
      setTimeout(() => {
        setActuatorUi((prev) =>
          prev[actuator].error?.startsWith("Couldn't send")
            ? { ...prev, [actuator]: {} }
            : prev
        );
      }, 5000);
    }
  };

  const handleDismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleChangeFeedInterval = async (minutes: number) => {
    // Optimistic UI: remember what the user clicked so the FeedSchedule
    // panel can show the new value immediately even before device_settings'
    // realtime push lands. Cleared once `deviceSettings.feedIntervalMinutes`
    // catches up (effect below) or on error.
    setScheduleUi({ pending: true, pendingValue: minutes });
    try {
      await updateFeedInterval(minutes);
      // Success: leave pendingValue set until device_settings echoes back via
      // realtime; that effect clears it. The subsequent reload_settings poll
      // (~3s) drives the firmware to start using the new interval, which in
      // turn surfaces as actuator_state.feed_interval_minutes -- the
      // "applying" badge on FeedSchedule clears at that point.
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Send failed';
      console.error('[dashboard] updateFeedInterval failed:', err);
      setScheduleUi({ error: `Couldn't update: ${msg}` });
      setTimeout(() => {
        setScheduleUi((prev) => (prev.error ? {} : prev));
      }, 5000);
    }
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
              <ControlPanel
                status={actuatorStatus}
                onToggle={handleToggleActuator}
                uiInfo={actuatorUi}
                settings={deviceSettings}
                onChangeFeedInterval={handleChangeFeedInterval}
                scheduleUi={scheduleUi}
              />
            </div>
          </section>

          {/* ── Historical Charts ────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <SectionHeader title="Historical Trends" />
              <TimeRangePicker
                value={historicalRange}
                onChange={setHistoricalRange}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HistoricalChart
                data={historicalData}
                parameter="temperature"
                title="Temperature"
                unit="°C"
                color="#f97316"
                rangeKey={historicalRange}
              />
              <HistoricalChart
                data={historicalData}
                parameter="pH"
                title="pH Level"
                unit=""
                color="#6366f1"
                rangeKey={historicalRange}
              />
              <HistoricalChart
                data={historicalData}
                parameter="dissolvedOxygen"
                title="Dissolved Oxygen"
                unit="mg/L"
                color="#10b981"
                rangeKey={historicalRange}
              />
              <HistoricalChart
                data={historicalData}
                parameter="electricalConductivity"
                title="Electrical Conductivity"
                unit="mS/cm"
                color="#f59e0b"
                rangeKey={historicalRange}
              />
            </div>
          </section>

          {/* ── Recent Activity (firmware-pushed system events) ─────────── */}
          <section>
            <SectionHeader title="System Activity" />
            <RecentActivity events={recentEvents} />
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
