'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { Layers, Map, AlertTriangle, Navigation, Radio, Play, Pause, Zap, Activity } from 'lucide-react';

const SCENARIOS = [
  { id: 'normal', label: 'Normal Traffic', icon: '🟢', desc: 'Baseline traffic conditions' },
  { id: 'peak-hour', label: 'Peak Hour', icon: '🟡', desc: 'Rush hour surge (1.8x density)' },
  { id: 'accident', label: 'Accident Scenario', icon: '🔴', desc: 'Lane blockage + spillover' },
  { id: 'ambulance-crisis', label: 'Ambulance Crisis', icon: '🚨', desc: 'Emergency green corridor demo' },
] as const;

type ScenarioId = typeof SCENARIOS[number]['id'];

export default function ControlPanel() {
  const {
    showHeatmap, showConflictZones, showPredictions, showEmergencyLayer,
    toggleLayer, isSimulationRunning, toggleSimulation, simulationSpeed, setSimulationSpeed,
    activeScenario, setScenario, triggerEmergency, intersections,
    systemMetrics,
  } = useHydraStore();

  const [activeTab, setActiveTab] = useState<'layers' | 'scenarios' | 'corridor' | 'signals'>('layers');

  const layerToggles = [
    { key: 'heatmap' as const, label: 'Heatmap', icon: <Map size={10} />, active: showHeatmap, color: '#ff6b35' },
    { key: 'conflict' as const, label: 'Conflict Zones', icon: <AlertTriangle size={10} />, active: showConflictZones, color: '#ffcc00' },
    { key: 'predictions' as const, label: 'Predictions', icon: <Activity size={10} />, active: showPredictions, color: '#8b5cf6' },
    { key: 'emergency' as const, label: 'Emergency', icon: <Navigation size={10} />, active: showEmergencyLayer, color: '#ff2d55' },
  ];

  const corridors = [...new Set(intersections.map(i => i.corridor))];

  return (
    <div className="hydra-panel flex flex-col h-full overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-hydra-border flex-shrink-0">
        {[
          { id: 'layers', icon: <Layers size={10} />, label: 'Layers' },
          { id: 'scenarios', icon: <Play size={10} />, label: 'Scenarios' },
          { id: 'corridor', icon: <Radio size={10} />, label: 'Corridors' },
          { id: 'signals', icon: <Zap size={10} />, label: 'Signals' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 text-[9px] font-mono flex flex-col items-center gap-0.5 transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-secondary hover:text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Simulation Controls */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">SIMULATION</div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSimulation}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-mono font-bold transition-all"
              style={{
                background: isSimulationRunning ? '#ff2d5515' : '#00ff8815',
                borderWidth: 1,
                borderColor: isSimulationRunning ? '#ff2d5540' : '#00ff8840',
                color: isSimulationRunning ? '#ff2d55' : '#00ff88',
              }}
            >
              {isSimulationRunning ? <><Pause size={12} /> PAUSE</> : <><Play size={12} /> RESUME</>}
            </button>
            <div className="flex rounded border border-hydra-border overflow-hidden">
              {[1, 2, 4].map(speed => (
                <button
                  key={speed}
                  onClick={() => setSimulationSpeed(speed)}
                  className="px-2 py-1.5 text-[10px] font-mono transition-colors"
                  style={{
                    background: simulationSpeed === speed ? '#00f5ff15' : 'transparent',
                    color: simulationSpeed === speed ? '#00f5ff' : '#6b8db0',
                  }}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-hydra-border" />

        {/* Layers Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'layers' && (
            <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">MAP LAYERS</div>
              {layerToggles.map(({ key, label, icon, active, color }) => (
                <button
                  key={key}
                  onClick={() => toggleLayer(key)}
                  className="w-full flex items-center justify-between p-2 rounded hydra-card transition-all"
                  style={active ? { borderColor: color + '40', background: color + '08' } : {}}
                >
                  <div className="flex items-center gap-2" style={{ color: active ? color : '#6b8db0' }}>
                    {icon}
                    <span className="text-[10px] font-mono">{label}</span>
                  </div>
                  <div
                    className="w-7 h-3.5 rounded-full relative transition-colors"
                    style={{ background: active ? color + '40' : '#0d2137' }}
                  >
                    <div
                      className="absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all"
                      style={{
                        left: active ? 'calc(100% - 12px)' : '2px',
                        background: active ? color : '#2a4060',
                        boxShadow: active ? `0 0 6px ${color}` : 'none',
                      }}
                    />
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Scenarios Tab */}
          {activeTab === 'scenarios' && (
            <motion.div key="scenarios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">DEMO SCENARIOS</div>
              {SCENARIOS.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setScenario(scenario.id)}
                  className="w-full text-left p-2.5 rounded hydra-card transition-all space-y-0.5"
                  style={activeScenario === scenario.id ? { borderColor: '#00f5ff40', background: '#00f5ff08' } : {}}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{scenario.icon}</span>
                      <span className="text-[10px] font-mono font-bold" style={{ color: activeScenario === scenario.id ? '#00f5ff' : '#e2f0ff' }}>
                        {scenario.label}
                      </span>
                    </div>
                    {activeScenario === scenario.id && (
                      <span className="text-[9px] font-mono text-cyan">● ACTIVE</span>
                    )}
                  </div>
                  <div className="text-[9px] font-mono text-secondary pl-5">{scenario.desc}</div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Corridors Tab */}
          {activeTab === 'corridor' && (
            <motion.div key="corridor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">CORRIDOR STATUS</div>
              {corridors.map(corridor => {
                const corrIntersections = intersections.filter(i => i.corridor === corridor);
                const avgDensity = corrIntersections.reduce((s, i) => s + i.densityScore, 0) / corrIntersections.length;
                const avgStress = corrIntersections.reduce((s, i) => s + i.stressIndex, 0) / corrIntersections.length;
                const color = avgDensity > 75 ? '#ff2d55' : avgDensity > 50 ? '#ffcc00' : '#00ff88';

                return (
                  <div key={corridor} className="hydra-card p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold" style={{ color }}>{corridor}</span>
                      <span className="text-[9px] font-mono text-secondary">{corrIntersections.length} signals</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                      <div className="text-secondary">Avg Density: <span style={{ color }}>{avgDensity.toFixed(0)}%</span></div>
                      <div className="text-secondary">Stress: <span style={{ color }}>{avgStress.toFixed(0)}%</span></div>
                    </div>
                    {/* Mini signal row */}
                    <div className="flex gap-1.5">
                      {corrIntersections.map(i => (
                        <div key={i.id} className="flex flex-col items-center gap-0.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              background: i.currentSignal === 'GREEN' ? '#00cc44' : i.currentSignal === 'YELLOW' ? '#ffcc00' : '#ff2d55',
                              boxShadow: `0 0 6px ${i.currentSignal === 'GREEN' ? '#00cc44' : i.currentSignal === 'YELLOW' ? '#ffcc00' : '#ff2d55'}`,
                            }}
                          />
                          <span className="text-[7px] font-mono text-muted">{i.countdown}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Signals Tab */}
          {activeTab === 'signals' && (
            <motion.div key="signals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">ALL SIGNALS</div>
              {intersections.map(i => (
                <div key={i.id} className="hydra-card p-2 flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: i.currentSignal === 'GREEN' ? '#00cc44' : i.currentSignal === 'YELLOW' ? '#ffcc00' : '#ff2d55',
                      boxShadow: `0 0 6px ${i.currentSignal === 'GREEN' ? '#00cc44' : i.currentSignal === 'YELLOW' ? '#ffcc00' : '#ff2d55'}`,
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[9px] font-mono truncate" style={{ color: i.isEmergency ? '#ff2d55' : '#e2f0ff' }}>
                      {i.isEmergency ? '🚨 ' : ''}{i.name}
                    </div>
                    <div className="text-[8px] font-mono text-secondary">{i.countdown}s | D:{i.densityScore.toFixed(0)}%</div>
                  </div>
                  <div className="text-[9px] font-mono text-secondary flex-shrink-0">{i.greenDuration}s</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emergency Action */}
        <div className="border-t border-hydra-border pt-3">
          <button
            onClick={() => {
              const route = intersections.slice(0, 4).map(i => i.id);
              useHydraStore.getState().triggerEmergency(route);
            }}
            className="w-full py-2.5 rounded font-mono text-xs font-bold transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #ff2d5510, #ff6b3510)',
              border: '1px solid #ff2d5540',
              color: '#ff2d55',
            }}
          >
            🚨 TRIGGER EMERGENCY CORRIDOR
          </button>
        </div>
      </div>
    </div>
  );
}
