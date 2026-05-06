'use client';

import { ActuatorStatus } from '@/types';
import { Droplets, Wind, UtensilsCrossed, Info, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ControlPanelProps {
  status: ActuatorStatus;
  onToggle: (actuator: keyof ActuatorStatus) => void;
}

const actuatorConfig = [
  {
    key: 'aeration' as keyof ActuatorStatus,
    label: 'Aeration System',
    icon: Wind,
    description: 'Controls oxygen levels in water',
    color: '#06b6d4',
    activeBg: 'rgba(6,182,212,0.08)',
    activeBorder: 'rgba(6,182,212,0.2)',
  },
  {
    key: 'waterCirculation' as keyof ActuatorStatus,
    label: 'Water Circulation',
    icon: Droplets,
    description: 'Maintains water flow and quality',
    color: '#6366f1',
    activeBg: 'rgba(99,102,241,0.08)',
    activeBorder: 'rgba(99,102,241,0.2)',
  },
  {
    key: 'feeding' as keyof ActuatorStatus,
    label: 'Feeding System',
    icon: UtensilsCrossed,
    description: 'Automated feeding mechanism',
    color: '#10b981',
    activeBg: 'rgba(16,185,129,0.08)',
    activeBorder: 'rgba(16,185,129,0.2)',
  },
];

export default function ControlPanel({ status, onToggle }: ControlPanelProps) {
  return (
    <div
      className="glass rounded-2xl border border-white/[0.06] p-5 flex flex-col"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-400" />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Control Panel
        </h2>
      </div>

      {/* Actuator list */}
      <div className="space-y-3">
        {actuatorConfig.map((actuator) => {
          const isActive = status[actuator.key];
          const Icon = actuator.icon;

          return (
            <div
              key={actuator.key}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-300"
              style={{
                background: isActive ? actuator.activeBg : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isActive ? actuator.activeBorder : 'rgba(255,255,255,0.05)'}`,
                boxShadow: isActive ? `0 0 16px ${actuator.color}18` : 'none',
              }}
            >
              {/* Icon */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={{
                  background: isActive ? `${actuator.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isActive ? `${actuator.color}30` : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <Icon
                  className="w-4 h-4 transition-colors duration-300"
                  style={{ color: isActive ? actuator.color : '#64748b' }}
                />
              </div>

              {/* Label + description */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold transition-colors duration-300 truncate"
                  style={{ color: isActive ? '#f8fafc' : '#94a3b8' }}
                >
                  {actuator.label}
                </p>
                <p className="text-[11px] text-slate-600 truncate">{actuator.description}</p>
              </div>

              {/* Status + Toggle */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest transition-colors duration-300"
                  style={{ color: isActive ? actuator.color : '#475569' }}
                >
                  {isActive ? 'ON' : 'OFF'}
                </span>

                {/* Toggle switch */}
                <button
                  onClick={() => onToggle(actuator.key)}
                  className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${actuator.color}, ${actuator.color}cc)`
                      : 'rgba(255,255,255,0.08)',
                    border: `1px solid ${isActive ? actuator.color + '60' : 'rgba(255,255,255,0.1)'}`,
                    boxShadow: isActive ? `0 0 12px ${actuator.color}40` : 'none',
                  }}
                  aria-label={`Toggle ${actuator.label}`}
                >
                  <span
                    className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300"
                    style={{
                      left: isActive ? 'calc(100% - 22px)' : '2px',
                      boxShadow: isActive
                        ? `0 1px 4px ${actuator.color}60, 0 0 0 1px ${actuator.color}20`
                        : '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Last-feed indicator */}
      <FeedingStatus
        lastFeedAt={status.lastFeedAt}
        feedCountToday={status.feedCountToday}
      />

      {/* Info footer */}
      <div
        className="mt-3 flex items-start gap-2.5 rounded-xl p-3.5"
        style={{
          background: 'rgba(6,182,212,0.05)',
          border: '1px solid rgba(6,182,212,0.1)',
        }}
      >
        <Info className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-semibold text-cyan-400 mb-0.5">Automated Control Active</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Actuators respond automatically to sensor readings. Manual override is available for emergencies.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Feeding status (last fed + daily count) ────────────────────────────────
function FeedingStatus({
  lastFeedAt,
  feedCountToday,
}: {
  lastFeedAt: Date | null;
  feedCountToday: number;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  let label: string;
  if (!lastFeedAt) {
    label = 'Never';
  } else {
    const diffMs = now.getTime() - lastFeedAt.getTime();
    const sec = Math.max(0, Math.floor(diffMs / 1000));
    if (sec < 60) label = `${sec}s ago`;
    else if (sec < 3600) label = `${Math.floor(sec / 60)} min ago`;
    else if (sec < 86400) label = `${Math.floor(sec / 3600)}h ago`;
    else label = `${Math.floor(sec / 86400)}d ago`;
  }

  return (
    <div
      className="mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
      style={{
        background: 'rgba(16,185,129,0.05)',
        border: '1px solid rgba(16,185,129,0.12)',
      }}
    >
      <Clock className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-2">
        <span className="text-[11px] text-slate-500">Last feed</span>
        <span className="text-xs font-semibold text-emerald-300 tabular-nums">{label}</span>
      </div>
      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full tabular-nums">
        {feedCountToday} today
      </span>
    </div>
  );
}
