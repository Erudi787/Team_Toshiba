'use client';

import { SensorData } from '@/types';
import { WATER_QUALITY_THRESHOLDS } from '@/lib/constants';
import { Thermometer, Droplets, Wind, Zap } from 'lucide-react';

interface SensorCardProps {
  data: SensorData;
  label: string;
  unit: string;
  icon: React.ReactNode;
  threshold: { min: number; max: number };
  color: string;
}

function CircularGauge({
  value,
  min,
  max,
  color,
  icon,
}: {
  value: number;
  min: number;
  max: number;
  color: string;
  icon: React.ReactNode;
}) {
  const radius = 30;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const offset = circumference * (1 - progress);

  return (
    <div className="relative flex-shrink-0 w-[76px] h-[76px]">
      <svg width="76" height="76" className="-rotate-90" style={{ overflow: 'visible' }}>
        {/* Track ring */}
        <circle
          cx="38" cy="38" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx="38" cy="38" r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: `drop-shadow(0 0 5px ${color}99)`,
            transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </svg>
      {/* Centered icon */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ color }}
      >
        {icon}
      </div>
    </div>
  );
}

export default function SensorCard({
  data,
  label,
  unit,
  icon,
  threshold,
  color,
}: SensorCardProps) {
  const getValue = () => {
    if (label === 'Temperature') return data.temperature;
    if (label === 'pH') return data.pH;
    if (label === 'Dissolved Oxygen') return data.dissolvedOxygen;
    if (label === 'Electrical Conductivity') return data.electricalConductivity;
    return 0;
  };

  const value = getValue();
  const isInRange = value >= threshold.min && value <= threshold.max;
  const progress = Math.max(0, Math.min(100, ((value - threshold.min) / (threshold.max - threshold.min)) * 100));

  return (
    <div
      className="group relative overflow-hidden rounded-2xl glass border border-white/[0.06] p-5 transition-all duration-300 hover:border-white/[0.12] hover:-translate-y-0.5"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${color} 50%, transparent 100%)`,
        }}
      />

      {/* Subtle corner radial tint */}
      <div
        className="absolute top-0 right-0 w-32 h-32 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(circle at top right, ${color}14, transparent 70%)`,
        }}
      />

      {/* Content row */}
      <div className="relative flex items-start justify-between gap-3">
        {/* Left: label + value + status */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 truncate">
            {label}
          </p>

          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[2rem] font-bold text-white tabular-nums leading-none">
              {value.toFixed(2)}
            </span>
            {unit && (
              <span className="text-sm font-medium text-slate-500">{unit}</span>
            )}
          </div>

          {/* Status badge */}
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              color: isInRange ? '#34d399' : '#f87171',
              background: isInRange ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
              border: `1px solid ${isInRange ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: isInRange ? '#34d399' : '#f87171' }}
            />
            {isInRange ? 'Normal' : 'Alert'}
          </span>
        </div>

        {/* Right: circular gauge */}
        <CircularGauge
          value={value}
          min={threshold.min}
          max={threshold.max}
          color={color}
          icon={icon}
        />
      </div>

      {/* Bottom: range bar */}
      <div className="relative mt-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[10px] text-slate-600 tabular-nums">
            {threshold.min}{unit}
          </span>
          <span className="text-[10px] text-slate-600 tabular-nums">
            {threshold.max}{unit}
          </span>
        </div>
        <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full progress-bar"
            style={{
              width: `${progress}%`,
              background: isInRange
                ? `linear-gradient(90deg, ${color}55, ${color})`
                : 'linear-gradient(90deg, #f8717155, #f87171)',
              boxShadow: isInRange
                ? `0 0 10px ${color}80`
                : '0 0 10px #f8717180',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function TemperatureCard({ data }: { data: SensorData }) {
  return (
    <SensorCard
      data={data}
      label="Temperature"
      unit="°C"
      icon={<Thermometer className="w-5 h-5" />}
      threshold={WATER_QUALITY_THRESHOLDS.temperature}
      color="#f97316"
    />
  );
}

export function PHCard({ data }: { data: SensorData }) {
  return (
    <SensorCard
      data={data}
      label="pH Level"
      unit=""
      icon={<Droplets className="w-5 h-5" />}
      threshold={WATER_QUALITY_THRESHOLDS.pH}
      color="#6366f1"
    />
  );
}

export function DissolvedOxygenCard({ data }: { data: SensorData }) {
  return (
    <SensorCard
      data={data}
      label="Dissolved Oxygen"
      unit="mg/L"
      icon={<Wind className="w-5 h-5" />}
      threshold={WATER_QUALITY_THRESHOLDS.dissolvedOxygen}
      color="#10b981"
    />
  );
}

export function ElectricalConductivityCard({ data }: { data: SensorData }) {
  return (
    <SensorCard
      data={data}
      label="Electrical Conductivity"
      unit="mS/cm"
      icon={<Zap className="w-5 h-5" />}
      threshold={WATER_QUALITY_THRESHOLDS.electricalConductivity}
      color="#f59e0b"
    />
  );
}
