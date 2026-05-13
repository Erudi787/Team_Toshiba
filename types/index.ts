export interface SensorData {
  temperature: number; // Celsius
  pH: number;
  dissolvedOxygen: number; // mg/L
  electricalConductivity: number; // mS/cm
  timestamp: Date;
}

export interface ActuatorStatus {
  aeration: boolean;
  waterCirculation: boolean;
  feeding: boolean;
  light: boolean;
  lastFeedAt: Date | null;
  feedCountToday: number;
  // Feed interval (minutes) the firmware reports it is *currently* using.
  // Compare against DeviceSettings.feedIntervalMinutes to detect "applying..."
  // drift after the operator changes the schedule from the dashboard.
  // Null when the firmware hasn't upserted with this field yet (pre-upgrade).
  feedIntervalMinutesActive: number | null;
}

export interface DeviceSettings {
  feedIntervalMinutes: number;
  updatedAt: Date;
}

// Time ranges for the Historical Trends section. Each value is in minutes;
// the chart fetches sensor_readings.created_at >= now() - range_minutes.
export type HistoricalRangeKey = '1h' | '6h' | '24h' | '7d' | '30d';

export interface HistoricalRange {
  key: HistoricalRangeKey;
  label: string;
  minutes: number;
}

export const HISTORICAL_RANGES: readonly HistoricalRange[] = [
  { key: '1h',  label: '1 hour',  minutes: 60 },
  { key: '6h',  label: '6 hours', minutes: 360 },
  { key: '24h', label: '24 hours', minutes: 1440 },
  { key: '7d',  label: '7 days', minutes: 10_080 },
  { key: '30d', label: '30 days', minutes: 43_200 },
] as const;

export interface SystemEvent {
  id: number;
  type: 'info' | 'warning' | 'error';
  parameter: string | null;
  message: string;
  timestamp: Date;
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: Date;
  parameter?: 'temperature' | 'pH' | 'dissolvedOxygen' | 'electricalConductivity';
}

export interface WaterQualityThresholds {
  temperature: { min: number; max: number };
  pH: { min: number; max: number };
  dissolvedOxygen: { min: number; max: number };
  electricalConductivity: { min: number; max: number };
}

export interface HistoricalData {
  timestamp: Date;
  temperature: number;
  pH: number;
  dissolvedOxygen: number;
  electricalConductivity: number;
}


