'use client';

import { motion } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { Activity, Gauge, Clock, TrendingDown, Leaf, Zap } from 'lucide-react';

interface MetricTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  change?: string;
  trend?: 'up' | 'down';
}

function MetricTile({ label, value, unit, icon, color, change, trend }: MetricTileProps) {
  return (
    <motion.div
      className="hydra-card p-3 corner-bracket space-y-2 flex flex-col"
      whileHover={{ borderColor: color + '60', boxShadow: `0 0 20px ${color}10` }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-secondary uppercase tracking-wide">{label}</span>
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-xl font-bold" style={{ color, textShadow: `0 0 10px ${color}40` }}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-secondary">{unit}</span>}
      </div>
      {change && (
        <div className={`text-[9px] font-mono flex items-center gap-1 ${trend === 'down' ? 'text-green-400' : 'text-red-400'}`}>
          <span>{trend === 'down' ? '↓' : '↑'}</span>
          <span>{change}</span>
        </div>
      )}
    </motion.div>
  );
}

export default function SystemMetricsBar() {
  const { systemMetrics, isSimulationRunning } = useHydraStore();

  const metrics = [
    {
      label: 'Avg Wait Time',
      value: systemMetrics.averageWaitTime,
      unit: 's',
      icon: <Clock size={12} />,
      color: systemMetrics.averageWaitTime > 60 ? '#ff2d55' : systemMetrics.averageWaitTime > 40 ? '#ffcc00' : '#00ff88',
      change: '-12s vs unoptimized',
      trend: 'down' as const,
    },
    {
      label: 'Throughput',
      value: systemMetrics.throughputRate,
      unit: 'veh/min',
      icon: <Activity size={12} />,
      color: '#00f5ff',
      change: '+28% efficiency',
      trend: 'up' as const,
    },
    {
      label: 'Network Stress',
      value: systemMetrics.networkStress,
      unit: '%',
      icon: <Gauge size={12} />,
      color: systemMetrics.networkStress > 70 ? '#ff2d55' : systemMetrics.networkStress > 50 ? '#ffcc00' : '#00ff88',
    },
    {
      label: 'Signal Efficiency',
      value: systemMetrics.signalEfficiency,
      unit: '%',
      icon: <Zap size={12} />,
      color: '#8b5cf6',
      change: '+30% vs fixed timer',
      trend: 'up' as const,
    },
    {
      label: 'Fuel Saved',
      value: systemMetrics.fuelSaved,
      unit: 'L',
      icon: <TrendingDown size={12} />,
      color: '#00ff88',
      change: 'today',
    },
    {
      label: 'CO₂ Reduced',
      value: systemMetrics.co2Reduced,
      unit: 'kg',
      icon: <Leaf size={12} />,
      color: '#00ff88',
      change: 'today',
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* System Status */}
      <div className="hydra-card px-3 py-2 flex items-center gap-2 flex-shrink-0">
        <div className={`status-dot ${isSimulationRunning ? 'online' : 'offline'}`} />
        <span className="text-[10px] font-mono text-secondary">
          {isSimulationRunning ? 'AI ACTIVE' : 'PAUSED'}
        </span>
      </div>

      {/* Metrics */}
      {metrics.map((m) => (
        <div
          key={m.label}
          className="hydra-card px-3 py-1.5 flex items-center gap-3 flex-shrink-0"
        >
          <div style={{ color: m.color }}>{m.icon}</div>
          <div>
            <div className="text-[9px] font-mono text-secondary">{m.label}</div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-display text-sm font-bold" style={{ color: m.color }}>{m.value}</span>
              {m.unit && <span className="text-[9px] font-mono text-secondary">{m.unit}</span>}
            </div>
          </div>
        </div>
      ))}

      {/* Active Emergencies */}
      {systemMetrics.activeIncidents > 0 && (
        <motion.div
          className="hydra-card px-3 py-1.5 flex items-center gap-2"
          style={{ borderColor: '#ff2d5540' }}
          animate={{ borderColor: ['#ff2d5540', '#ff2d55', '#ff2d5540'] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <span className="status-dot critical" />
          <div>
            <div className="text-[9px] font-mono text-secondary">Active Incidents</div>
            <div className="font-display text-sm font-bold text-red-400">{systemMetrics.activeIncidents}</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
