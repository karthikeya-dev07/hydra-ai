'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { PredictionCard } from './MetricDisplays';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Brain, TrendingUp, AlertOctagon } from 'lucide-react';

export default function PredictionPanel() {
  const { intersections, predictions } = useHydraStore();

  const critical = predictions.filter(p => p.riskLevel === 'CRITICAL');
  const high = predictions.filter(p => p.riskLevel === 'HIGH');
  const moderate = predictions.filter(p => p.riskLevel === 'MODERATE');

  // Network-wide congestion trend
  const networkData = intersections[0]?.historicalData?.map((d, i) => ({
    time: i,
    avg: intersections.reduce((s, inter) => {
      const point = inter.historicalData[i];
      return s + (point ? point.density : 0);
    }, 0) / intersections.length,
    predicted: Math.min(100, intersections.reduce((s, inter) => {
      const point = inter.historicalData[i];
      return s + (point ? point.density : 0);
    }, 0) / intersections.length + (i > 15 ? (i - 15) * 1.5 : 0)),
  })) || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain size={12} className="text-cyan" />
        <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">PREDICTIVE INTELLIGENCE</span>
      </div>

      {/* Alert summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'CRITICAL', count: critical.length, color: '#ff2d55' },
          { label: 'HIGH', count: high.length, color: '#ffcc00' },
          { label: 'MODERATE', count: moderate.length, color: '#00f5ff' },
        ].map(({ label, count, color }) => (
          <div key={label} className="hydra-card p-2 text-center">
            <div className="font-display text-xl font-bold" style={{ color }}>{count}</div>
            <div className="text-[9px] font-mono text-secondary">{label}</div>
          </div>
        ))}
      </div>

      {/* Network congestion trend */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          <TrendingUp size={10} className="text-cyan" />
          <span className="text-[10px] font-mono text-secondary">NETWORK-WIDE DENSITY FORECAST</span>
        </div>
        <div className="hydra-card p-2" style={{ height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={networkData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0d2137" />
              <XAxis dataKey="time" hide />
              <YAxis domain={[0, 100]} hide />
              <Tooltip
                contentStyle={{ background: '#040d1a', border: '1px solid #0d2137', borderRadius: 4, fontSize: 10 }}
                formatter={(v: number) => [v.toFixed(1) + '%']}
                labelFormatter={() => ''}
              />
              <Line type="monotone" dataKey="avg" stroke="#00f5ff" strokeWidth={1.5} dot={false} name="Actual" />
              <Line type="monotone" dataKey="predicted" stroke="#ff2d55" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Predicted" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1.5">
          <div className="flex items-center gap-1"><div className="w-4 h-px bg-cyan-400" /><span className="text-[9px] font-mono text-secondary">Actual</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-px border-t border-dashed border-red-500" /><span className="text-[9px] font-mono text-secondary">AI Predicted</span></div>
        </div>
      </div>

      {/* Critical predictions */}
      {critical.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <AlertOctagon size={10} className="text-red-400" />
            <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">CRITICAL PREDICTIONS</span>
          </div>
          <div className="space-y-2">
            {critical.map(pred => {
              const inter = intersections.find(i => i.id === pred.intersectionId);
              return inter ? (
                <PredictionCard
                  key={pred.intersectionId}
                  riskLevel={pred.riskLevel}
                  minutesAhead={pred.minutesAhead}
                  confidence={pred.confidence}
                  reason={pred.reason}
                  intersectionName={inter.name}
                />
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* High risk predictions */}
      {high.length > 0 && (
        <div>
          <div className="text-[10px] font-mono text-yellow-500 uppercase tracking-widest mb-2">HIGH RISK</div>
          <div className="space-y-2">
            {high.slice(0, 3).map(pred => {
              const inter = intersections.find(i => i.id === pred.intersectionId);
              return inter ? (
                <PredictionCard
                  key={pred.intersectionId}
                  riskLevel={pred.riskLevel}
                  minutesAhead={pred.minutesAhead}
                  confidence={pred.confidence}
                  reason={pred.reason}
                  intersectionName={inter.name}
                />
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
