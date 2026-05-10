'use client';

import { motion } from 'framer-motion';
import { RiskLevel } from '@/lib/store';

// ── Density Score Ring ────────────────────────────────────────
interface DensityRingProps {
  value: number;       // 0-100
  label: string;
  size?: number;
  color?: string;
}

export function DensityRing({ value, label, size = 80, color }: DensityRingProps) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = circ * (1 - value / 100);

  const ringColor = color || (value > 75 ? '#ff2d55' : value > 50 ? '#ffcc00' : value > 25 ? '#00f5ff' : '#00ff88');

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Track */}
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0d2137" strokeWidth={6} />
          {/* Fill */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke={ringColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={circ}
            animate={{ strokeDashoffset: fill }}
            initial={{ strokeDashoffset: circ }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 6px ${ringColor}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-sm font-bold" style={{ color: ringColor }}>
            {Math.round(value)}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-secondary text-center">{label}</span>
    </div>
  );
}

// ── Stress Bar ─────────────────────────────────────────────
interface StressBarProps {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  showGlow?: boolean;
}

export function StressBar({ label, value, max = 100, unit = '', showGlow }: StressBarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 75 ? '#ff2d55' : pct > 50 ? '#ffcc00' : pct > 25 ? '#00f5ff' : '#00ff88';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-secondary">{label}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>
          {typeof value === 'number' ? value.toFixed(value < 10 ? 1 : 0) : value}{unit}
        </span>
      </div>
      <div className="density-bar">
        <motion.div
          className="density-bar-fill"
          style={{
            background: color,
            boxShadow: showGlow ? `0 0 8px ${color}60` : 'none',
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// ── Risk Badge ────────────────────────────────────────────────
interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

export function RiskBadge({ level, size = 'md', pulse }: RiskBadgeProps) {
  const config = {
    LOW:      { color: '#00ff88', bg: '#00ff8815', label: 'LOW' },
    MODERATE: { color: '#00f5ff', bg: '#00f5ff15', label: 'MODERATE' },
    HIGH:     { color: '#ffcc00', bg: '#ffcc0015', label: 'HIGH' },
    CRITICAL: { color: '#ff2d55', bg: '#ff2d5515', label: 'CRITICAL' },
  }[level];

  const textSize = size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-sm' : 'text-xs';
  const pad = size === 'sm' ? 'px-1.5 py-0.5' : size === 'lg' ? 'px-3 py-1.5' : 'px-2 py-1';

  return (
    <motion.span
      className={`inline-flex items-center gap-1 font-mono font-bold rounded ${textSize} ${pad}`}
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}30` }}
      animate={pulse ? { opacity: [1, 0.6, 1] } : {}}
      transition={{ duration: 0.8, repeat: Infinity }}
    >
      <span className="status-dot" style={{ background: config.color, boxShadow: `0 0 6px ${config.color}`, width: 5, height: 5 }} />
      {config.label}
    </motion.span>
  );
}

// ── Vehicle Count Display ─────────────────────────────────────
interface VehicleCountsProps {
  counts: Record<string, number>;
  compact?: boolean;
}

const VEHICLE_ICONS: Record<string, string> = {
  bike: '🏍️', car: '🚗', auto: '🛺', bus: '🚌', truck: '🚛', pedestrian: '🚶', ambulance: '🚑',
};
const VEHICLE_WEIGHTS: Record<string, number> = {
  bike: 1, car: 2, auto: 2, bus: 5, truck: 6, pedestrian: 0.5, ambulance: 0,
};

export function VehicleCounts({ counts, compact }: VehicleCountsProps) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const weighted = Object.entries(counts).reduce((s, [t, c]) => s + (VEHICLE_WEIGHTS[t] || 1) * c, 0);

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {Object.entries(counts).map(([type, count]) => count > 0 && (
          <span key={type} className="text-xs font-mono flex items-center gap-0.5">
            <span>{VEHICLE_ICONS[type]}</span>
            <span className="text-secondary">{count}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-mono text-secondary">
        <span>Total: <span className="text-cyan font-bold">{total}</span></span>
        <span>Weighted: <span className="text-orange font-bold">{weighted.toFixed(0)}</span></span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(counts).map(([type, count]) => (
          <div key={type} className="flex items-center justify-between hydra-card px-2 py-1">
            <span className="text-xs flex items-center gap-1">
              <span>{VEHICLE_ICONS[type]}</span>
              <span className="text-secondary capitalize font-mono">{type}</span>
            </span>
            <span className={`text-xs font-mono font-bold ${type === 'ambulance' && count > 0 ? 'text-red' : 'text-primary'}`}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── AI Score Card ─────────────────────────────────────────────
interface AIScoreCardProps {
  label: string;
  value: number;
  unit?: string;
  icon?: string;
  inverse?: boolean; // lower is better
}

export function AIScoreCard({ label, value, unit = '', icon, inverse }: AIScoreCardProps) {
  const isGood = inverse ? value < 33 : value > 66;
  const isBad = inverse ? value > 66 : value < 33;
  const color = isGood ? '#00ff88' : isBad ? '#ff2d55' : '#ffcc00';

  return (
    <div className="hydra-card p-3 space-y-1 corner-bracket">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-secondary">{icon} {label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-display font-bold" style={{ color }}>
          {typeof value === 'number' ? (value < 10 ? value.toFixed(1) : Math.round(value)) : value}
        </span>
        <span className="text-xs text-secondary font-mono">{unit}</span>
      </div>
      <div className="density-bar">
        <motion.div
          className="density-bar-fill h-full"
          style={{ background: color }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
}

// ── Prediction Card ───────────────────────────────────────────
interface PredictionCardProps {
  riskLevel: RiskLevel;
  minutesAhead: number;
  confidence: number;
  reason: string;
  intersectionName: string;
}

export function PredictionCard({ riskLevel, minutesAhead, confidence, reason, intersectionName }: PredictionCardProps) {
  const borderColor = riskLevel === 'CRITICAL' ? '#ff2d55' : riskLevel === 'HIGH' ? '#ffcc00' : riskLevel === 'MODERATE' ? '#00f5ff' : '#00ff88';

  return (
    <motion.div
      className="hydra-card p-3 space-y-2"
      style={{ borderLeftColor: borderColor, borderLeftWidth: 3 }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-mono text-secondary">{intersectionName}</div>
          <div className="text-xs font-mono text-secondary">In <span className="text-cyan font-bold">{minutesAhead}min</span></div>
        </div>
        <RiskBadge level={riskLevel} size="sm" pulse={riskLevel === 'CRITICAL'} />
      </div>
      <div className="text-[10px] font-mono text-secondary leading-relaxed">{reason}</div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-mono text-muted">Confidence:</span>
        <div className="flex-1 density-bar h-1">
          <div className="density-bar-fill h-full" style={{ background: '#8b5cf6', width: `${confidence}%` }} />
        </div>
        <span className="text-[10px] font-mono text-purple">{confidence}%</span>
      </div>
    </motion.div>
  );
}
