'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { Layers, Play, Radio, Zap, AlertTriangle, Map, Activity, Navigation } from 'lucide-react';

const SCENARIOS = [
  { id: 'normal', label: 'Normal Traffic', emoji: '🟢', desc: 'Baseline conditions' },
  { id: 'peak-hour', label: 'Peak Hour', emoji: '🟡', desc: 'Rush hour surge (1.8×)' },
  { id: 'accident', label: 'Accident', emoji: '🔴', desc: 'Lane blockage + spillover' },
  { id: 'ambulance-crisis', label: 'Emergency', emoji: '🚨', desc: 'Ambulance green corridor' },
] as const;

type ScenarioId = typeof SCENARIOS[number]['id'];
type Tab = 'layers' | 'scenarios' | 'corridors' | 'signals';

export default function ControlPanel() {
  const {
    showHeatmap, showConflictZones, showPredictions, showEmergencyLayer,
    toggleLayer, isSimulationRunning, toggleSimulation, simulationSpeed, setSimulationSpeed,
    activeScenario, setScenario, intersections,
  } = useHydraStore();

  const [activeTab, setActiveTab] = useState<Tab>('scenarios');

  const layers = [
    { key: 'heatmap' as const, label: 'Density Heatmap', icon: Map, active: showHeatmap, color: '#fb923c' },
    { key: 'conflict' as const, label: 'Conflict Zones', icon: AlertTriangle, active: showConflictZones, color: '#fbbf24' },
    { key: 'predictions' as const, label: 'AI Predictions', icon: Activity, active: showPredictions, color: '#a78bfa' },
    { key: 'emergency' as const, label: 'Emergency Layer', icon: Navigation, active: showEmergencyLayer, color: '#f87171' },
  ];

  const corridors = Array.from(new Set(intersections.map(i => i.corridor)));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'scenarios', label: 'Scenarios', icon: <Play size={13} /> },
    { id: 'layers', label: 'Layers', icon: <Layers size={13} /> },
    { id: 'corridors', label: 'Corridors', icon: <Radio size={13} /> },
    { id: 'signals', label: 'Signals', icon: <Zap size={13} /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="text-sm font-semibold text-white mb-3">Controls</div>

        {/* Sim Toggle + Speed */}
        <div className="space-y-2">
          <button
            id="sidebar-sim-toggle"
            onClick={toggleSimulation}
            className="w-full btn flex items-center justify-center gap-2 text-sm"
            style={{
              background: isSimulationRunning ? '#f8717115' : '#34d39915',
              border: `1px solid ${isSimulationRunning ? '#f8717140' : '#34d39940'}`,
              color: isSimulationRunning ? '#f87171' : '#34d399',
              borderRadius: '10px',
              padding: '9px',
              fontWeight: 600,
            }}
          >
            {isSimulationRunning ? <><span>⏸</span> Pause Simulation</> : <><span>▶</span> Run Simulation</>}
          </button>

          <div className="flex gap-1.5">
            <span className="text-[11px] text-secondary self-center mr-1">Speed:</span>
            {[1, 2, 4].map(s => (
              <button
                key={s}
                id={`speed-${s}x`}
                onClick={() => setSimulationSpeed(s)}
                className="flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all"
                style={{
                  background: simulationSpeed === s ? 'var(--cyan)' : 'var(--bg-card)',
                  color: simulationSpeed === s ? '#0f1117' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`ctrl-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--cyan)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--cyan)' : 'var(--text-muted)',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">

          {/* Scenarios */}
          {activeTab === 'scenarios' && (
            <motion.div key="scenarios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  id={`scenario-${s.id}`}
                  onClick={() => setScenario(s.id)}
                  className="w-full text-left p-3 rounded-xl transition-all"
                  style={{
                    background: activeScenario === s.id ? 'var(--bg-hover)' : 'var(--bg-card)',
                    border: `1px solid ${activeScenario === s.id ? 'var(--cyan)' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{s.emoji}</span>
                      <span className="text-sm font-semibold text-white">{s.label}</span>
                    </div>
                    {activeScenario === s.id && (
                      <span className="badge badge-cyan text-[10px]">Active</span>
                    )}
                  </div>
                  <div className="text-[11px] text-secondary mt-1 pl-7">{s.desc}</div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Layers */}
          {activeTab === 'layers' && (
            <motion.div key="layers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {layers.map(({ key, label, icon: Icon, active, color }) => (
                <button
                  key={key}
                  id={`layer-${key}`}
                  onClick={() => toggleLayer(key)}
                  className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
                  style={{
                    background: active ? color + '10' : 'var(--bg-card)',
                    border: `1px solid ${active ? color + '50' : 'var(--border)'}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: active ? color + '20' : 'var(--bg-secondary)' }}>
                      <Icon size={13} color={active ? color : 'var(--text-muted)'} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {label}
                    </span>
                  </div>
                  {/* Toggle */}
                  <div className="toggle-track" style={{ background: active ? color + '50' : 'var(--border)' }}>
                    <div className="toggle-thumb" style={{ left: active ? '18px' : '3px', background: active ? color : 'var(--text-muted)' }} />
                  </div>
                </button>
              ))}
            </motion.div>
          )}

          {/* Corridors */}
          {activeTab === 'corridors' && (
            <motion.div key="corridors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {corridors.map(corridor => {
                const cIntersections = intersections.filter(i => i.corridor === corridor);
                const avgDensity = cIntersections.reduce((s, i) => s + i.densityScore, 0) / cIntersections.length;
                const color = avgDensity > 75 ? '#f87171' : avgDensity > 50 ? '#fbbf24' : '#34d399';

                return (
                  <div key={corridor} id={`corridor-${corridor?.replace(/\s+/g,'-')}`} className="hydra-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{corridor}</span>
                      <span className="text-[11px] font-medium" style={{ color }}>{cIntersections.length} signals</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-secondary">Avg Density</span>
                        <span className="font-semibold" style={{ color }}>{avgDensity.toFixed(0)}%</span>
                      </div>
                      <div className="density-bar">
                        <div className="density-bar-fill" style={{ width: `${avgDensity}%`, background: color }} />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {cIntersections.map(i => (
                        <div key={i.id} className="flex flex-col items-center gap-0.5">
                          <div className="w-3 h-3 rounded-full" style={{
                            background: i.currentSignal === 'GREEN' ? '#10b981' : i.currentSignal === 'YELLOW' ? '#f59e0b' : '#ef4444',
                            boxShadow: `0 0 5px ${i.currentSignal === 'GREEN' ? '#10b98180' : i.currentSignal === 'YELLOW' ? '#f59e0b80' : '#ef444480'}`,
                          }} />
                          <span className="text-[8px] text-muted">{i.countdown}s</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Signals */}
          {activeTab === 'signals' && (
            <motion.div key="signals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
              {intersections.map(i => {
                const sigColor = i.currentSignal === 'GREEN' ? '#10b981' : i.currentSignal === 'YELLOW' ? '#f59e0b' : '#ef4444';
                return (
                  <div key={i.id} id={`signal-row-${i.id}`} className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: sigColor, boxShadow: `0 0 5px ${sigColor}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium truncate"
                        style={{ color: i.isEmergency ? '#f87171' : 'var(--text-primary)' }}>
                        {i.isEmergency ? '🚨 ' : ''}{i.name}
                      </div>
                      <div className="text-[10px] text-muted">{i.countdown}s · D:{i.densityScore.toFixed(0)}%</div>
                    </div>
                    <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: sigColor }}>
                      {i.currentSignal}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Emergency Button */}
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          id="emergency-corridor-btn"
          onClick={() => {
            const route = intersections.slice(0, 4).map(i => i.id);
            useHydraStore.getState().triggerEmergency(route);
          }}
          className="w-full btn btn-danger text-sm"
        >
          🚨 Trigger Emergency Corridor
        </button>
      </div>
    </div>
  );
}
