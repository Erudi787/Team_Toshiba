import { createClient } from '@supabase/supabase-js';
import type { SensorData, ActuatorStatus, HistoricalData, SystemEvent } from '@/types';

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

export function mapActuatorRow(r: ActuatorStateRow): ActuatorStatus {
  return {
    aeration: r.aeration,
    waterCirculation: r.water_circulation,
    feeding: r.feeding,
    lastFeedAt: r.last_feed_at ? new Date(r.last_feed_at) : null,
    feedCountToday: r.feed_count_today ?? 0,
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
export type ToggleableActuator = 'aeration' | 'waterCirculation' | 'feeding';

// Dashboard key (camelCase) → DB enum value (snake_case)
const dbActuatorKey: Record<ToggleableActuator, string> = {
  aeration: 'aeration',
  waterCirculation: 'water_circulation',
  feeding: 'feeding',
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

export async function fetchActuatorState(): Promise<ActuatorStatus | null> {
  const { data, error } = await supabase
    .from('actuator_state')
    .select('*')
    .eq('device_id', DEVICE_ID)
    .maybeSingle();
  if (error || !data) return null;
  return mapActuatorRow(data as ActuatorStateRow);
}
