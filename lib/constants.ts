import { WaterQualityThresholds } from '@/types';

export const WATER_QUALITY_THRESHOLDS: WaterQualityThresholds = {
  temperature: { min: 20, max: 28 }, // Optimal range for crayfish
  pH: { min: 6.5, max: 8.5 },
  dissolvedOxygen: { min: 5, max: 12 }, // mg/L
  electricalConductivity: { min: 0.1, max: 2.0 }, // mS/cm
};

export const SENSOR_UPDATE_INTERVAL = 5000; // 5 seconds


