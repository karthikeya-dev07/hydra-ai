'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { Bell, X, AlertTriangle, Info, Zap, AlertOctagon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';

const ALERT_CONFIG = {
  emergency: { color: '#f87171', bg: '#f8717110', icon: AlertOctagon, label: 'Emergency' },
  critical:  { color: '#fb923c', bg: '#fb923c10', icon: AlertTriangle, label: 'Critical' },
  warning:   { color: '#fbbf24', bg: '#fbbf2410', icon: Zap, label: 'Warning' },
  info:      { color: '#38bdf8', bg: '#38bdf810', icon: Info, label: 'Info' },
};

export default function AlertsPanel() {
  const { alerts, acknowledgeAlert } = useHydraStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const unacked = alerts.filter(a => !a.acknowledged);
  const visible = alerts.slice(0, 8);

  return (
    <div className="space-y-2" id="alerts-panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Bell size={13} style={{ color: 'var(--cyan)' }} />
          <span className="text-sm font-semibold text-white">AI Alerts</span>
          {unacked.length > 0 && (
            <motion.span
              className="badge badge-red"
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {unacked.length} new
            </motion.span>
          )}
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        <AnimatePresence>
          {visible.map((alert) => {
            const config = ALERT_CONFIG[alert.type];
            const Icon = config.icon;
            return (
              <motion.div
                key={alert.id}
                id={`alert-${alert.id}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: alert.acknowledged ? 0.35 : 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15 }}
                className="alert-item"
                style={alert.type === 'emergency' ? { borderColor: '#f8717140', background: '#f8717108' } :
                       alert.type === 'critical' ? { borderColor: '#fb923c30' } :
                       alert.type === 'warning' ? { borderColor: '#fbbf2430' } : {}}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: config.bg, marginTop: 1 }}>
                  <Icon size={13} color={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-relaxed"
                    style={{ color: alert.acknowledged ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    {alert.message}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {mounted ? formatDistanceToNow(alert.timestamp, { addSuffix: true }) : ''}
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button
                    id={`ack-${alert.id}`}
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
                  >
                    <X size={11} color="var(--text-muted)" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
