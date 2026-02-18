'use client';

import { HistoricalData } from '@/types';
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
}

interface TooltipPayload {
  value: number;
  name: string;
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
      <p className="text-[11px] text-slate-500 mb-1">{label}</p>
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
}: HistoricalChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const chartData =
    data.length > 0
      ? data.map(item => ({
          time: format(new Date(item.timestamp), 'HH:mm:ss'),
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
