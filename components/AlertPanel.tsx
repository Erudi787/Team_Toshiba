'use client';

import { Alert } from '@/types';
import { AlertCircle, X, Info, AlertTriangle, ShieldCheck } from 'lucide-react';
import { formatTimestamp } from '@/lib/utils';
import { useState } from 'react';

interface AlertPanelProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

const alertConfig = {
  error: {
    icon: AlertCircle,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.06)',
    border: 'rgba(248,113,113,0.15)',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.06)',
    border: 'rgba(251,191,36,0.15)',
    label: 'Warning',
  },
  info: {
    icon: Info,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.06)',
    border: 'rgba(96,165,250,0.15)',
    label: 'Info',
  },
};

export default function AlertPanel({ alerts, onDismiss }: AlertPanelProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id));
    onDismiss?.(id);
  };

  const activeAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));
  const errorCount = activeAlerts.filter(a => a.type === 'error').length;

  return (
    <div
      className="glass rounded-2xl border border-white/[0.06] p-5 flex flex-col"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-5 rounded-full bg-gradient-to-b from-red-400 to-orange-400" />
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            System Alerts
          </h2>
        </div>
        {activeAlerts.length > 0 && (
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{
              color: errorCount > 0 ? '#f87171' : '#fbbf24',
              background: errorCount > 0 ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
              border: `1px solid ${errorCount > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: errorCount > 0 ? '#f87171' : '#fbbf24' }}
            />
            {activeAlerts.length} Active
          </span>
        )}
      </div>

      {/* Empty state */}
      {activeAlerts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}
          >
            <ShieldCheck className="w-7 h-7" style={{ color: '#34d399' }} />
          </div>
          <p className="text-sm font-semibold text-slate-300 mb-1">All Systems Normal</p>
          <p className="text-xs text-slate-600">No active alerts detected</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {activeAlerts.map((alert) => {
            const cfg = alertConfig[alert.type];
            const Icon = cfg.icon;
            return (
              <div
                key={alert.id}
                className="relative flex items-start gap-3 rounded-xl px-3.5 py-3 transition-all duration-200"
                style={{
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                }}
              >
                {/* Left accent */}
                <div
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                  style={{ background: cfg.color }}
                />

                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-snug">
                    {alert.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{
                        color: cfg.color,
                        background: `${cfg.color}15`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-600">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-white/10 transition-all duration-150"
                  aria-label="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
