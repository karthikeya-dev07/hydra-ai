'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { SignalState } from '@/lib/store';

interface TrafficSignalProps {
  state: SignalState;
  countdown: number;
  greenDuration: number;
  isEmergency?: boolean;
  compact?: boolean;
}

export function TrafficSignal({ state, countdown, greenDuration, isEmergency, compact }: TrafficSignalProps) {
  const size = compact ? 'w-6 h-6' : 'w-10 h-10';
  const housingPad = compact ? 'p-1.5 gap-1.5' : 'p-2.5 gap-2.5';

  const lights: { color: 'red' | 'yellow' | 'green'; active: boolean }[] = [
    { color: 'red',    active: state === 'RED' },
    { color: 'yellow', active: state === 'YELLOW' },
    { color: 'green',  active: state === 'GREEN' },
  ];

  const progress = state === 'GREEN' ? (countdown / greenDuration) * 100 : 0;

  return (
    <div className={`flex flex-col items-center gap-2 ${isEmergency ? 'emergency-active' : ''}`}>
      {/* Housing */}
      <div className={`signal-housing flex flex-col items-center ${housingPad} ${isEmergency ? 'border-red-500' : ''}`}>
        {lights.map(({ color, active }) => (
          <motion.div
            key={color}
            className={`signal-light ${color} ${active ? 'active' : 'inactive'} ${size}`}
            animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Countdown */}
      {!compact && (
        <div className="text-center">
          <div className={`ticker-number text-2xl font-bold ${
            state === 'GREEN' ? 'text-green' :
            state === 'RED' ? 'text-red' :
            'text-yellow'
          }`}>
            {countdown}s
          </div>
          {state === 'GREEN' && (
            <div className="mt-1 w-16">
              <div className="density-bar">
                <motion.div
                  className="density-bar-fill"
                  style={{ background: 'var(--green)', width: `${progress}%` }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {isEmergency && (
        <motion.div
          className="text-xs font-mono text-red font-bold"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          🚨 PRIORITY
        </motion.div>
      )}
    </div>
  );
}

// ── Animated Signal Timer Bar ────────────────────────────────
interface SignalTimerProps {
  state: SignalState;
  countdown: number;
  total: number;
}

export function SignalTimerBar({ state, countdown, total }: SignalTimerProps) {
  const pct = total > 0 ? Math.min(100, (countdown / total) * 100) : 0;
  const color = state === 'GREEN' ? '#00ff88' : state === 'RED' ? '#ff2d55' : '#ffcc00';

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-mono text-secondary mb-1">
        <span style={{ color }}>{state}</span>
        <span>{countdown}s / {total}s</span>
      </div>
      <div className="density-bar h-2">
        <motion.div
          className="density-bar-fill h-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}60` }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
    </div>
  );
}

// ── Mini Signal Grid (for corridors) ────────────────────────
interface MiniSignalGridProps {
  signals: { id: string; state: SignalState; name: string }[];
}

export function MiniSignalGrid({ signals }: MiniSignalGridProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {signals.map((s) => (
        <div key={s.id} className="flex flex-col items-center gap-1">
          <TrafficSignal state={s.state} countdown={30} greenDuration={45} compact />
          <span className="text-[9px] font-mono text-secondary text-center max-w-[60px] leading-tight">{s.name.split(' ')[0]}</span>
        </div>
      ))}
    </div>
  );
}
