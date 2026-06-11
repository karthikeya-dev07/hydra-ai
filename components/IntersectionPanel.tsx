'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { TrafficSignal, SignalTimerBar } from './TrafficSignal';
import { DensityRing, StressBar, RiskBadge, VehicleCounts } from './MetricDisplays';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { X, Zap, AlertTriangle, TrendingUp, Shield, Navigation } from 'lucide-react';

export default function IntersectionPanel() {
  const { intersections, selectedIntersection, setSelectedIntersection } = useHydraStore();

  const intersection = intersections.find(i => i.id === selectedIntersection);

  let showOnRight = true;
  if (intersection) {
    const lngs = intersections.map(i => i.lng);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const midLng = (minLng + maxLng) / 2;
    // If the node is on the left half (lng < midLng), show panel on the right.
    showOnRight = intersection.lng < midLng;
  }

  return (
    <AnimatePresence>
      {intersection && (
        <motion.div
          key={intersection.id}
          initial={{ x: showOnRight ? '100%' : '-100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: showOnRight ? '100%' : '-100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`absolute top-0 bottom-0 w-[360px] z-30 flex flex-col overflow-hidden ${showOnRight ? 'right-0' : 'left-0'}`}
          style={{ 
            background: 'rgba(15,17,23,0.97)', 
            backdropFilter: 'blur(20px)', 
            borderLeft: showOnRight ? '1px solid var(--border)' : 'none',
            borderRight: !showOnRight ? '1px solid var(--border)' : 'none'
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <div className="text-[10px] font-medium text-secondary mb-0.5 uppercase tracking-widest">
                Intersection Details
              </div>
              <h2 className="font-display font-bold text-sm leading-tight" style={{ color: 'var(--cyan)' }}>{intersection.name}</h2>
              <div className="text-[10px] text-secondary mt-0.5">
                {intersection.lat.toFixed(4)}°N, {intersection.lng.toFixed(4)}°E
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RiskBadge level={intersection.predictedCongestion} size="sm" pulse={intersection.predictedCongestion === 'CRITICAL'} />
              <button
                onClick={() => setSelectedIntersection(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <X size={15} color="var(--text-secondary)" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Emergency Banner */}
            {intersection.isEmergency && (
              <motion.div
                className="rounded-md p-3 flex items-center gap-2 border"
                style={{ background: '#ff2d5510', borderColor: '#ff2d5560' }}
                animate={{ borderColor: ['#ff2d5560', '#ff2d55', '#ff2d5560'] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Shield className="text-red-500 flex-shrink-0" size={16} />
                <div>
                  <div className="text-xs font-bold text-red-400">EMERGENCY CORRIDOR ACTIVE</div>
                  <div className="text-[10px] font-mono text-secondary">Ambulance priority — Green wave synchronized</div>
                </div>
              </motion.div>
            )}

            {/* Signal + Key Metrics Row */}
            <div className="flex items-center gap-4">
              <TrafficSignal
                state={intersection.currentSignal}
                countdown={intersection.countdown}
                greenDuration={intersection.greenDuration}
                isEmergency={intersection.isEmergency}
              />
              <div className="flex-1 space-y-2">
                <SignalTimerBar
                  state={intersection.currentSignal}
                  countdown={intersection.countdown}
                  total={intersection.currentSignal === 'GREEN' ? intersection.greenDuration : intersection.redDuration}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="hydra-card p-2 text-center">
                    <div className="text-[10px] text-secondary">Green Duration</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--green)' }}>{intersection.greenDuration}s</div>
                  </div>
                  <div className="hydra-card p-2 text-center">
                    <div className="text-[10px] text-secondary">Queue</div>
                    <div className="text-sm font-bold" style={{ color: 'var(--cyan)' }}>{intersection.queueLength}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Rings */}
            <div>
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                <Zap size={10} className="text-cyan" /> REAL-TIME METRICS
              </div>
              <div className="grid grid-cols-4 gap-2">
                <DensityRing value={intersection.densityScore} label="DENSITY" size={64} />
                <DensityRing value={intersection.stressIndex} label="STRESS" size={64} />
                <DensityRing value={intersection.spilloverRisk} label="SPILLOVER" size={64} />
                <DensityRing value={intersection.gridlockProbability} label="GRIDLOCK" size={64} />
              </div>
            </div>

            {/* Stress Bars */}
            <div>
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp size={10} className="text-cyan" /> TRAFFIC INTELLIGENCE
              </div>
              <div className="space-y-2">
                <StressBar label="Queue Growth Rate" value={intersection.queueGrowthRate} max={10} unit=" veh/min" showGlow />
                <StressBar label="Conflict Score" value={intersection.conflictScore} max={100} unit="%" showGlow />
                <StressBar label="Lane Intrusion" value={Math.round(intersection.conflictScore * 0.7)} max={100} unit="%" />
                <StressBar label="Bike Swarm Index" value={Math.round(intersection.vehicleCounts.bike * 1.5)} max={60} unit="" />
                <StressBar label="Stop-Line Violations" value={Math.round(intersection.stressIndex * 0.3)} max={100} unit="" />
              </div>
            </div>

            {/* AI Reasoning */}
            <div>
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
                <Navigation size={10} className="text-cyan" /> AI DECISION ENGINE
              </div>
              <div className="ai-reasoning">
                {intersection.aiReasoning}
              </div>
              <div className="mt-2 hydra-card p-2 text-center">
                <div className="text-[10px] font-mono text-secondary">Recommended Green Duration</div>
                <div className="text-2xl font-display font-bold text-green">{intersection.greenDuration}s</div>
                <div className="text-[9px] font-mono text-secondary">
                  = 30 + α({intersection.densityScore.toFixed(0)}) + β({intersection.queueGrowthRate.toFixed(1)}) {intersection.isEmergency ? '+ γ(emergency)' : ''}
                </div>
              </div>
            </div>

            {/* Prediction */}
            <div>
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-2 flex items-center gap-2">
                <AlertTriangle size={10} className="text-cyan" /> CONGESTION PREDICTION
              </div>
              <div className="hydra-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-secondary">Next 5 minutes</span>
                  <RiskBadge level={intersection.predictedCongestion} size="sm" pulse />
                </div>
                <div className="text-[10px] font-mono text-secondary leading-relaxed">
                  {intersection.predictedCongestion === 'CRITICAL' && '⚠️ Junction collapse imminent. Reduce inflow immediately.'}
                  {intersection.predictedCongestion === 'HIGH' && '🔴 High congestion building. Signal timing adjusted.'}
                  {intersection.predictedCongestion === 'MODERATE' && '🟡 Moderate buildup expected. Monitor queue growth.'}
                  {intersection.predictedCongestion === 'LOW' && '✅ Traffic stable. Normal operations maintained.'}
                </div>
              </div>
            </div>

            {/* Historical Chart */}
            <div>
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-2">DENSITY HISTORY (20 min)</div>
              <div className="hydra-card p-2" style={{ height: 100 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={intersection.historicalData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="densityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00f5ff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff2d55" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ff2d55" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip
                      contentStyle={{ background: '#040d1a', border: '1px solid #0d2137', borderRadius: 4, fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      labelFormatter={() => ''}
                      formatter={(v: number, name: string) => [v.toFixed(1) + '%', name === 'density' ? 'Density' : 'Stress']}
                    />
                    <Area type="monotone" dataKey="density" stroke="#00f5ff" strokeWidth={1.5} fill="url(#densityGrad)" dot={false} />
                    <Area type="monotone" dataKey="stress" stroke="#ff2d55" strokeWidth={1} fill="url(#stressGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Vehicle Counts */}
            <div>
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-2">DETECTED VEHICLES</div>
              <VehicleCounts counts={intersection.vehicleCounts} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
