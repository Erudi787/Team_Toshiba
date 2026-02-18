import { SensorData, Alert, WaterQualityThresholds } from '@/types';
import { WATER_QUALITY_THRESHOLDS } from './constants';

export function checkWaterQuality(data: SensorData): Alert[] {
  const alerts: Alert[] = [];
  const thresholds = WATER_QUALITY_THRESHOLDS;

  if (data.temperature < thresholds.temperature.min || data.temperature > thresholds.temperature.max) {
    alerts.push({
      id: `temp-${Date.now()}`,
      type: data.temperature < thresholds.temperature.min || data.temperature > thresholds.temperature.max ? 'error' : 'warning',
      message: `Temperature is ${data.temperature < thresholds.temperature.min ? 'too low' : 'too high'}: ${data.temperature}°C`,
      timestamp: new Date(),
      parameter: 'temperature',
    });
  }

  if (data.pH < thresholds.pH.min || data.pH > thresholds.pH.max) {
    alerts.push({
      id: `ph-${Date.now()}`,
      type: 'error',
      message: `pH is ${data.pH < thresholds.pH.min ? 'too low' : 'too high'}: ${data.pH}`,
      timestamp: new Date(),
      parameter: 'pH',
    });
  }

  if (data.dissolvedOxygen < thresholds.dissolvedOxygen.min) {
    alerts.push({
      id: `do-${Date.now()}`,
      type: 'error',
      message: `Dissolved oxygen is too low: ${data.dissolvedOxygen} mg/L`,
      timestamp: new Date(),
      parameter: 'dissolvedOxygen',
    });
  }

  if (data.electricalConductivity < thresholds.electricalConductivity.min || 
      data.electricalConductivity > thresholds.electricalConductivity.max) {
    alerts.push({
      id: `ec-${Date.now()}`,
      type: 'warning',
      message: `Electrical conductivity is out of range: ${data.electricalConductivity} mS/cm`,
      timestamp: new Date(),
      parameter: 'electricalConductivity',
    });
  }

  return alerts;
}

export function formatTimestamp(date: Date): string {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return date.toLocaleString();
  }
}

