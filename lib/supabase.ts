import { createClient } from '@supabase/supabase-js';
import type { SensorData, ActuatorStatus, HistoricalData, SystemEvent, DeviceSettings } from '@/types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.local.example to .env.local and fill in your project values.'
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  realtime: { params: { eventsPerSecond: 10 } },
});

export const DEVICE_ID = process.env.NEXT_PUBLIC_DEVICE_ID || 'crayfish-01';

// ─── DB row shapes (snake_case from Postgres) ────────────────────────
export interface SensorReadingRow {
  id: number;
  device_id: string;
  temperature: number | null;
  ph: number | null;
  dissolved_oxygen: number | null;
  electrical_conductivity: number | null;
  sensor_fault: boolean;
  alarm_active: boolean;
  created_at: string;
}

export interface ActuatorStateRow {
  device_id: string;
  aeration: boolean;
  water_circulation: boolean;
  feeding: boolean;
  light: boolean;
  feed_count_today: number;
  last_feed_at: string | null;
  updated_at: string;
  // Added 2026-05-13: firmware reports the feed interval it is currently
  // using here. Nullable for backwards compat with pre-upgrade firmware.
  feed_interval_minutes: number | null;
}

export interface DeviceSettingsRow {
  device_id: string;
  feed_interval_minutes: number;
  updated_at: string;
}

// ─── Mappers (snake_case row → camelCase domain type) ────────────────
export function mapSensorRow(r: SensorReadingRow): SensorData {
  return {
    temperature: r.temperature ?? 0,
    pH: r.ph ?? 0,
    dissolvedOxygen: r.dissolved_oxygen ?? 0,
    electricalConductivity: r.electrical_conductivity ?? 0,
    timestamp: new Date(r.created_at),
  };
}

export function mapHistoricalRow(r: SensorReadingRow): HistoricalData {
  return {
    timestamp: new Date(r.created_at),
    temperature: r.temperature ?? 0,
    pH: r.ph ?? 0,
    dissolvedOxygen: r.dissolved_oxygen ?? 0,
    electricalConductivity: r.electrical_conductivity ?? 0,
  };
}

// Dates before this are considered firmware-clock-not-synced garbage
// (e.g. a 1970-01-01 written before the NTP guard was added).
const MIN_VALID_DATE = new Date('2020-01-01T00:00:00Z');

function parseSafeDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime()) || d < MIN_VALID_DATE) return null;
  return d;
}

export function mapActuatorRow(r: ActuatorStateRow): ActuatorStatus {
  return {
    aeration: r.aeration,
    waterCirculation: r.water_circulation,
    feeding: r.feeding,
    light: r.light,
    lastFeedAt: parseSafeDate(r.last_feed_at),
    feedCountToday: r.feed_count_today ?? 0,
    feedIntervalMinutesActive: r.feed_interval_minutes ?? null,
  };
}

export function mapDeviceSettingsRow(r: DeviceSettingsRow): DeviceSettings {
  return {
    feedIntervalMinutes: r.feed_interval_minutes,
    updatedAt: new Date(r.updated_at),
  };
}

export interface AlertRow {
  id: number;
  device_id: string;
  type: 'info' | 'warning' | 'error';
  parameter: string | null;
  message: string;
  created_at: string;
}

export function mapAlertRow(r: AlertRow): SystemEvent {
  return {
    id: r.id,
    type: r.type,
    parameter: r.parameter,
    message: r.message,
    timestamp: new Date(r.created_at),
  };
}

export async function fetchRecentAlerts(limit = 10): Promise<SystemEvent[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as AlertRow[]).map(mapAlertRow);
}

// Subset of ActuatorStatus that maps to a togglable hardware actuator.
// Excludes informational fields like lastFeedAt / feedCountToday.
export type ToggleableActuator = 'aeration' | 'waterCirculation' | 'feeding' | 'light';

// Dashboard key (camelCase) → DB enum value (snake_case)
const dbActuatorKey: Record<ToggleableActuator, string> = {
  aeration: 'aeration',
  waterCirculation: 'water_circulation',
  feeding: 'feeding',
  light: 'light',
};

export async function sendActuatorCommand(
  actuator: ToggleableActuator,
  state: boolean
): Promise<void> {
  const { error } = await supabase.from('actuator_commands').insert({
    device_id: DEVICE_ID,
    actuator: dbActuatorKey[actuator],
    state,
  });
  if (error) throw error;
}

export async function fetchLatestSensorReading(): Promise<SensorData | null> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapSensorRow(data as SensorReadingRow);
}

export async function fetchHistoricalReadings(limit = 50): Promise<HistoricalData[]> {
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as SensorReadingRow[]).map(mapHistoricalRow).reverse();
}

// Fetch all rows newer than `now() - rangeMinutes`, capped at `maxRows`.
// Returned in chronological order (oldest first) so recharts can plot
// left-to-right without a reverse on the consumer side.
//
// We don't bin server-side; for ranges that would exceed maxRows the chart
// shows a window of the most recent maxRows points, with a note in the UI.
// Server-side aggregation (date_trunc / time_bucket) is a future improvement
// once thesis demo constraints lift.
export async function fetchHistoricalReadingsByRange(
  rangeMinutes: number,
  maxRows = 2000,
): Promise<HistoricalData[]> {
  const sinceIso = new Date(Date.now() - rangeMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from('sensor_readings')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(maxRows);
  if (error || !data) return [];
  return (data as SensorReadingRow[]).map(mapHistoricalRow).reverse();
}

export async function fetchActuatorState(): Promise<ActuatorStatus | null> {
  const { data, error } = await supabase
    .from('actuator_state')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .maybeSingle();
  if (error || !data) return null;
  return mapActuatorRow(data as ActuatorStateRow);
}

export async function fetchDeviceSettings(): Promise<DeviceSettings | null> {
  const { data, error } = await supabase
    .from('device_settings')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .maybeSingle();
  if (error || !data) return null;
  return mapDeviceSettingsRow(data as DeviceSettingsRow);
}

// Hybrid path for instant settings updates:
//   1. Upsert device_settings (canonical persistent value the firmware
//      polls at boot or on demand)
//   2. Drop a `reload_settings` row into actuator_commands so the firmware,
//      which polls that queue every ~3s, re-reads device_settings without
//      waiting for a background refresh
//
// Both writes use the same anon-permissive RLS as the rest of the app.
// If either fails the caller throws -- the dashboard surfaces the error
// with the same UX as a failed actuator toggle.
export async function updateFeedInterval(minutes: number): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error(`feed interval must be an integer between 1 and 1440 (got ${minutes})`);
  }

  const { error: upsertErr } = await supabase
    .from('device_settings')
    .upsert(
      {
        device_id: DEVICE_ID,
        feed_interval_minutes: minutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'device_id' },
    );
  if (upsertErr) throw upsertErr;

  // Signal the firmware to re-read device_settings on its next ~3s poll.
  // `state` is unused by the reload_settings handler; we send `true` for
  // schema compatibility with the boolean column.
  const { error: signalErr } = await supabase
    .from('actuator_commands')
    .insert({
      device_id: DEVICE_ID,
      actuator: 'reload_settings',
      state: true,
    });
  if (signalErr) throw signalErr;
}
