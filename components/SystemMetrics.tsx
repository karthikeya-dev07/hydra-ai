'use client';

import { useHydraStore } from '@/lib/store';
import { Clock, Zap, AlertTriangle, TrendingUp, Leaf, Car } from 'lucide-react';

const metrics = [
  { key: 'averageWaitTime', label: 'Avg Wait', unit: 's', icon: Clock, color: '#38bdf8' },
  { key: 'throughputRate', label: 'Throughput', unit: '/min', icon: Car, color: '#34d399' },
  { key: 'networkStress', label: 'Net Stress', unit: '%', icon: TrendingUp, color: '#fbbf24' },
  { key: 'signalEfficiency', label: 'Efficiency', unit: '%', icon: Zap, color: '#a78bfa' },
  { key: 'activeIncidents', label: 'Incidents', unit: '', icon: AlertTriangle, color: '#f87171' },
  { key: 'fuelSaved', label: 'Fuel Saved', unit: 'L', icon: Leaf, color: '#34d399' },
];

export default function SystemMetrics() {
  const { systemMetrics } = useHydraStore();

  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-0.5" id="system-metrics-bar">
      {metrics.map(({ key, label, unit, icon: Icon, color }) => {
        const val = systemMetrics[key as keyof typeof systemMetrics];
        return (
          <div
            key={key}
            id={`metric-${key}`}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg flex-shrink-0"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: color + '18' }}>
              <Icon size={12} color={color} />
            </div>
            <div>
              <div className="text-[10px] text-secondary font-medium">{label}</div>
              <div className="text-sm font-bold text-white leading-tight">
                {typeof val === 'number' ? Math.round(val) : val}{unit}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
