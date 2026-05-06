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
}

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


