'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { Bell, X, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const ALERT_COLORS = {
  emergency: '#ff2d55',
  critical: '#ff6b35',
  warning: '#ffcc00',
  info: '#00f5ff',
};

export default function AlertsPanel() {
  const { alerts, acknowledgeAlert } = useHydraStore();
  const [expanded, setExpanded] = useState(false);

  const unacked = alerts.filter(a => !a.acknowledged);
  const visible = expanded ? alerts.slice(0, 10) : alerts.slice(0, 3);

  return (
    <div className="space-y-2">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <Bell size={12} className="text-cyan" />
          <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">AI ALERTS</span>
          {unacked.length > 0 && (
            <motion.span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
              style={{ background: '#ff2d5520', color: '#ff2d55', border: '1px solid #ff2d5540' }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {unacked.length} NEW
            </motion.span>
          )}
        </div>
        <span className="text-[10px] font-mono text-muted">{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Alert List */}
      <div className="space-y-1.5">
        <AnimatePresence>
          {visible.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: alert.acknowledged ? 0.4 : 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="hydra-card p-2.5 flex gap-2"
              style={{ borderLeftColor: ALERT_COLORS[alert.type], borderLeftWidth: 2 }}
            >
              <Zap size={10} className="flex-shrink-0 mt-0.5" style={{ color: ALERT_COLORS[alert.type] }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono leading-relaxed" style={{ color: alert.acknowledged ? '#2a4060' : '#e2f0ff' }}>
                  {alert.message}
                </div>
                <div className="text-[9px] font-mono text-muted mt-0.5">
                  {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                </div>
              </div>
              {!alert.acknowledged && (
                <button onClick={() => acknowledgeAlert(alert.id)} className="flex-shrink-0 p-0.5 hover:opacity-70">
                  <X size={10} className="text-muted" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
