'use client';

import { ActuatorStatus } from '@/types';
import type { ToggleableActuator } from '@/lib/supabase';
import {
  UtensilsCrossed,
  Info,
  Clock,
  Lightbulb,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ActuatorUiInfo {
  pending?: { expected: boolean; expectedFeedCount?: number };
  error?: string;
}

interface ControlPanelProps {
  status: ActuatorStatus;
  onToggle: (actuator: ToggleableActuator) => void;
  uiInfo?: Record<ToggleableActuator, ActuatorUiInfo>;
}

interface ActuatorConfigEntry {
  key: ToggleableActuator;
  label: string;
  icon: typeof Lightbulb;
  description: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  // Momentary actions (e.g. feeding) render as a one-shot button rather
  // than a sticky on/off toggle. They don't have a persistent state to
  // display since the action completes and resets within seconds.
  momentary?: boolean;
}

const actuatorConfig: ActuatorConfigEntry[] = [
  {
    key: 'feeding',
    label: 'Feeding System',
    icon: UtensilsCrossed,
    description: 'Trigger one feed cycle (also resets the auto-timer)',
    color: '#10b981',
    activeBg: 'rgba(16,185,129,0.08)',
    activeBorder: 'rgba(16,185,129,0.2)',
    momentary: true,
  },
  {
    key: 'light',
    label: 'Light',
    icon: Lightbulb,
    description: 'Photoperiod / dark-cycle simulation',
    color: '#f59e0b',
    activeBg: 'rgba(245,158,11,0.08)',
    activeBorder: 'rgba(245,158,11,0.2)',
  },
];

export default function ControlPanel({
  status,
  onToggle,
  uiInfo,
}: Readonly<ControlPanelProps>) {
  return (
    <div
      className="glass rounded-2xl border border-white/[0.06] p-5 flex flex-col"
      style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}
    >
      <PanelHeader />

      <div className="space-y-3">
        {actuatorConfig.map((actuator) => (
          <ActuatorRow
            key={actuator.key}
            actuator={actuator}
            isActive={status[actuator.key] as boolean}
            info={uiInfo?.[actuator.key]}
            onToggle={onToggle}
          />
        ))}
      </div>

      <FeedingStatus
        lastFeedAt={status.lastFeedAt}
        feedCountToday={status.feedCountToday}
      />

      <PanelFooterInfo />
    </div>
  );
}

// ─── Panel header ───────────────────────────────────────────────────────────
function PanelHeader() {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="w-1 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-400" />
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
        Control Panel
      </h2>
    </div>
  );
}

// ─── Footer info banner ─────────────────────────────────────────────────────
function PanelFooterInfo() {
  return (
    <div
      className="mt-3 flex items-start gap-2.5 rounded-xl p-3.5"
      style={{
        background: 'rgba(6,182,212,0.05)',
        border: '1px solid rgba(6,182,212,0.1)',
      }}
    >
      <Info className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-semibold text-cyan-400 mb-0.5">
          Automated Control Active
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Actuators respond automatically to sensor readings. Manual override is
          available for emergencies.
        </p>
      </div>
    </div>
  );
}

// ─── Single actuator row ────────────────────────────────────────────────────
interface ActuatorRowProps {
  actuator: ActuatorConfigEntry;
  isActive: boolean;
  info: ActuatorUiInfo | undefined;
  onToggle: (actuator: ToggleableActuator) => void;
}

function rowBorderColor(
  errorMsg: string | undefined,
  isPending: boolean,
  isActive: boolean,
  activeBorder: string
): string {
  if (errorMsg) return 'rgba(248,113,113,0.4)';
  if (isPending) return 'rgba(96,165,250,0.4)';
  if (isActive) return activeBorder;
  return 'rgba(255,255,255,0.05)';
}

function ActuatorRow({
  actuator,
  isActive,
  info,
  onToggle,
}: Readonly<ActuatorRowProps>) {
  const isPending = !!info?.pending;
  const errorMsg = info?.error;

  return (
    <div
      className="flex flex-col gap-1.5 rounded-xl px-4 py-3.5 transition-all duration-300"
      style={{
        background: isActive ? actuator.activeBg : 'rgba(255,255,255,0.02)',
        border: `1px solid ${rowBorderColor(errorMsg, isPending, isActive, actuator.activeBorder)}`,
        boxShadow: isActive ? `0 0 16px ${actuator.color}18` : 'none',
      }}
    >
      <div className="flex items-center gap-3">
        <ActuatorIcon actuator={actuator} isActive={isActive} />
        <ActuatorLabel actuator={actuator} isActive={isActive} />
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {actuator.momentary ? (
            <MomentaryButton
              actuator={actuator}
              isPending={isPending}
              onClick={() => onToggle(actuator.key)}
            />
          ) : (
            <ToggleControl
              actuator={actuator}
              isActive={isActive}
              isPending={isPending}
              onClick={() => onToggle(actuator.key)}
            />
          )}
        </div>
      </div>

      <RowFeedback
        errorMsg={errorMsg}
        isPending={isPending}
        momentary={!!actuator.momentary}
      />
    </div>
  );
}

// ─── Sub-components for an ActuatorRow ──────────────────────────────────────

function ActuatorIcon({
  actuator,
  isActive,
}: Readonly<{ actuator: ActuatorConfigEntry; isActive: boolean }>) {
  const Icon = actuator.icon;
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
      style={{
        background: isActive ? `${actuator.color}20` : 'rgba(255,255,255,0.04)',
        border: `1px solid ${
          isActive ? `${actuator.color}30` : 'rgba(255,255,255,0.06)'
        }`,
      }}
    >
      <Icon
        className="w-4 h-4 transition-colors duration-300"
        style={{ color: isActive ? actuator.color : '#64748b' }}
      />
    </div>
  );
}

function ActuatorLabel({
  actuator,
  isActive,
}: Readonly<{ actuator: ActuatorConfigEntry; isActive: boolean }>) {
  return (
    <div className="flex-1 min-w-0">
      <p
        className="text-sm font-semibold transition-colors duration-300 truncate"
        style={{ color: isActive ? '#f8fafc' : '#94a3b8' }}
      >
        {actuator.label}
      </p>
      <p className="text-[11px] text-slate-600 truncate">
        {actuator.description}
      </p>
    </div>
  );
}

function MomentaryButton({
  actuator,
  isPending,
  onClick,
}: Readonly<{
  actuator: ActuatorConfigEntry;
  isPending: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      disabled={isPending}
      className="px-3.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all duration-200 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        background: isPending
          ? 'rgba(96,165,250,0.15)'
          : `linear-gradient(135deg, ${actuator.color}, ${actuator.color}cc)`,
        color: isPending ? '#60a5fa' : '#f8fafc',
        border: `1px solid ${
          isPending ? 'rgba(96,165,250,0.3)' : actuator.color + '60'
        }`,
        boxShadow: isPending ? 'none' : `0 0 12px ${actuator.color}40`,
      }}
      aria-label={`Trigger ${actuator.label}`}
    >
      {isPending ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Feeding
        </span>
      ) : (
        'Feed Now'
      )}
    </button>
  );
}

function ToggleControl({
  actuator,
  isActive,
  isPending,
  onClick,
}: Readonly<{
  actuator: ActuatorConfigEntry;
  isActive: boolean;
  isPending: boolean;
  onClick: () => void;
}>) {
  return (
    <>
      <ToggleStatusText
        actuator={actuator}
        isActive={isActive}
        isPending={isPending}
      />
      <button
        onClick={onClick}
        disabled={isPending}
        className="relative w-11 h-6 rounded-full transition-all duration-300 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          background: isActive
            ? `linear-gradient(135deg, ${actuator.color}, ${actuator.color}cc)`
            : 'rgba(255,255,255,0.08)',
          border: `1px solid ${
            isActive ? actuator.color + '60' : 'rgba(255,255,255,0.1)'
          }`,
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
    </>
  );
}

function ToggleStatusText({
  actuator,
  isActive,
  isPending,
}: Readonly<{
  actuator: ActuatorConfigEntry;
  isActive: boolean;
  isPending: boolean;
}>) {
  if (isPending) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-blue-400">
        <Loader2 className="w-3 h-3 animate-spin" />
        Sending
      </span>
    );
  }
  return (
    <span
      className="text-[11px] font-bold uppercase tracking-widest transition-colors duration-300"
      style={{ color: isActive ? actuator.color : '#475569' }}
    >
      {isActive ? 'ON' : 'OFF'}
    </span>
  );
}

function RowFeedback({
  errorMsg,
  isPending,
  momentary,
}: Readonly<{
  errorMsg: string | undefined;
  isPending: boolean;
  momentary: boolean;
}>) {
  if (errorMsg) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-red-400 pl-12">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        <span className="truncate">{errorMsg}</span>
      </div>
    );
  }
  if (isPending) {
    return (
      <div className="text-[11px] text-blue-400/80 pl-12">
        {momentary
          ? 'Triggering feed cycle…'
          : 'Waiting for device acknowledgement…'}
      </div>
    );
  }
  return null;
}

// ─── Feeding status (last fed + daily count) ────────────────────────────────
function FeedingStatus({
  lastFeedAt,
  feedCountToday,
}: Readonly<{
  lastFeedAt: Date | null;
  feedCountToday: number;
}>) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

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
        <span className="text-xs font-semibold text-emerald-300 tabular-nums">
          {formatRelativeTime(lastFeedAt, now)}
        </span>
      </div>
      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full tabular-nums">
        {feedCountToday} today
      </span>
    </div>
  );
}

function formatRelativeTime(when: Date | null, now: Date): string {
  if (!when) return 'Never';
  const sec = Math.max(0, Math.floor((now.getTime() - when.getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}
