'use client';

import { HistoricalData, HistoricalRangeKey } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

interface HistoricalChartProps {
  data: HistoricalData[];
  parameter: 'temperature' | 'pH' | 'dissolvedOxygen' | 'electricalConductivity';
  title: string;
  unit: string;
  color: string;
  // Active time range — drives X-axis label format. Short ranges show clock
  // time; long ranges show date so the user isn't squinting at indistinguishable
  // timestamps. Optional with a sensible default for backwards compat.
  rangeKey?: HistoricalRangeKey;
}

// Pick a label format that's actually readable for each range. We lean on
// date-fns's tokens directly:
//   1h / 6h        → HH:mm  (sub-hour resolution that fits in the tick width)
//   24h            → HH:mm  (still clock-only; one day = same date everywhere)
//   7d / 30d       → MM/dd  (day-level resolution; clock time would be noise)
function formatTickForRange(date: Date, rangeKey: HistoricalRangeKey): string {
  switch (rangeKey) {
    case '1h':
    case '6h':
      return format(date, 'HH:mm');
    case '24h':
      return format(date, 'HH:mm');
    case '7d':
    case '30d':
      return format(date, 'MM/dd');
    default:
      return format(date, 'HH:mm:ss');
  }
}

// Tooltip uses a richer format -- the user is actively hovering, so we can
// afford the screen real estate. Always shows date + time so there's no
// ambiguity even on long ranges.
function formatTooltipLabelForRange(date: Date, rangeKey: HistoricalRangeKey): string {
  switch (rangeKey) {
    case '1h':
    case '6h':
    case '24h':
      return format(date, 'MMM d, HH:mm:ss');
    case '7d':
    case '30d':
      return format(date, 'MMM d, HH:mm');
    default:
      return format(date, 'MMM d, HH:mm:ss');
  }
}

interface TooltipPayload {
  value: number;
  name: string;
  payload?: { tooltipLabel?: string };
}

function CustomTooltip({
  active,
  payload,
  label,
  color,
  unit,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  color: string;
  unit: string;
}) {
  if (!active || !payload?.length) return null;

  // Prefer the richer tooltip label baked into the chart datum (date+time,
  // unambiguous on long ranges) and fall back to the X-axis tick label
  // (clock-only) if it isn't available.
  const richLabel = payload[0].payload?.tooltipLabel ?? label;

  return (
    <div
      className="rounded-xl px-3.5 py-2.5"
      style={{
        background: 'rgba(10,18,35,0.95)',
        border: `1px solid ${color}30`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <p className="text-[11px] text-slate-500 mb-1">{richLabel}</p>
      <p className="text-base font-bold" style={{ color }}>
        {Number(payload[0].value).toFixed(2)}
        <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
      </p>
    </div>
  );
}

export default function HistoricalChart({
  data,
  parameter,
  title,
  unit,
  color,
  rangeKey = '1h',
}: HistoricalChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData =
    data.length > 0
      ? data.map(item => ({
          time: formatTickForRange(new Date(item.timestamp), rangeKey),
          tooltipLabel: formatTooltipLabelForRange(new Date(item.timestamp), rangeKey),
          value: item[parameter],
        }))
      : [];

  const gradientId = `grad-${parameter}`;

  const Skeleton = (
    <div
      className="glass rounded-2xl border border-white/[0.06] p-5"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-5 rounded-full shimmer" />
        <div className="h-4 w-36 rounded-lg shimmer" />
      </div>
      <div className="h-[240px] flex items-center justify-center">
        <p className="text-xs text-slate-600">Loading chart…</p>
      </div>
    </div>
  );

  if (!mounted) return Skeleton;

  if (chartData.length === 0) {
    return (
      <div
        className="glass rounded-2xl border border-white/[0.06] p-5"
        style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div className="h-[240px] flex flex-col items-center justify-center">
          <TrendingUp className="w-8 h-8 mb-2 text-slate-700" />
          <p className="text-xs text-slate-600 text-center">
            Collecting data… readings will appear shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass rounded-2xl border border-white/[0.06] p-5"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <div
          className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            color,
            background: `${color}12`,
            border: `1px solid ${color}25`,
          }}
        >
          <TrendingUp className="w-3 h-3" />
          <span>{chartData.length} pts</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"   stopColor={color} stopOpacity={0.25} />
              <stop offset="95%"  stopColor={color} stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#475569', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            content={<CustomTooltip color={color} unit={unit} />}
            cursor={{
              stroke: `${color}30`,
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: color,
              stroke: 'rgba(10,18,35,0.9)',
              strokeWidth: 2,
              style: { filter: `drop-shadow(0 0 6px ${color})` },
            }}
            style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
