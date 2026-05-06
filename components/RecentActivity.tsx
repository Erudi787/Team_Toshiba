'use client';

import { SystemEvent } from '@/types';
import { Activity, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RecentActivityProps {
  events: SystemEvent[];
}

const TYPE_STYLES: Record<
  SystemEvent['type'],
  { color: string; bg: string; border: string; icon: React.ElementType }
> = {
  info: {
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.2)',
    icon: Info,
  },
  warning: {
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
    icon: AlertTriangle,
  },
  error: {
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.2)',
    icon: AlertCircle,
  },
};

function formatRelative(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

export default function RecentActivity({ events }: RecentActivityProps) {
  // Tick a clock every 15s so "X ago" labels stay fresh without re-fetching.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="glass rounded-2xl border border-white/[0.06] p-5 flex flex-col"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-violet-400" />
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Recent Activity
        </h2>
        {events.length > 0 && (
          <span className="ml-auto text-[10px] font-bold text-slate-400 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
            {events.length}
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
            <Activity className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-xs text-slate-500">No recent activity</p>
          <p className="text-[10px] text-slate-700 mt-1">
            Feeds, faults, and reconnects will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
          {events.map((evt) => {
            const styles = TYPE_STYLES[evt.type];
            const Icon = styles.icon;
            return (
              <div
                key={evt.id}
                className="flex items-start gap-3 rounded-xl p-3 transition-all duration-200"
                style={{
                  background: styles.bg,
                  border: `1px solid ${styles.border}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${styles.color}1a` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: styles.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-200 leading-tight">
                    {evt.message}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                    {formatRelative(evt.timestamp, now)}
                    {evt.parameter && (
                      <span className="ml-1.5 text-slate-600">· {evt.parameter}</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
