import { WaterQualityThresholds } from '@/types';

export const WATER_QUALITY_THRESHOLDS: WaterQualityThresholds = {
  // Aligned with firmware config.h (Karim et al. 2024, Zhao et al. 2024)
  temperature: { min: 23, max: 29 },
  pH: { min: 6.5, max: 8.5 },
  dissolvedOxygen: { min: 5, max: 12 }, // mg/L
  electricalConductivity: { min: 0.1, max: 2.0 }, // mS/cm
};

export const SENSOR_UPDATE_INTERVAL = 5000; // 5 seconds


