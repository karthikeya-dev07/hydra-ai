'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import {
  Brain, Cpu, Wifi, Settings, ChevronDown,
  Play, Pause, Layers, AlertOctagon, Navigation2
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ControlPanel from '@/components/ControlPanel';
import IntersectionPanel from '@/components/IntersectionPanel';
import AlertsPanel from '@/components/AlertsPanel';
import SystemMetrics from '@/components/SystemMetrics';
import PredictionPanel from '@/components/PredictionPanel';
import CameraFeed from '@/components/CameraFeed';

const TrafficMap = dynamic(() => import('@/components/TrafficMap'), { ssr: false });

type SideView = 'alerts' | 'predictions' | 'camera';

export default function HydraAIDashboard() {
  const { tickSimulation, isSimulationRunning, activeScenario, emergencyCorridors } = useHydraStore();
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const [sideView, setSideView] = useState<SideView>('alerts');
  const [clockStr, setClockStr] = useState('');

  // Simulation tick
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (isSimulationRunning) {
      tickRef.current = setInterval(() => tickSimulation(), 1000);
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [isSimulationRunning, tickSimulation]);

  // Clock
  useEffect(() => {
    const update = () => setClockStr(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const hasEmergency = emergencyCorridors.some(e => e.active);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Top Navbar ── */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-hydra-border flex-shrink-0"
        style={{ background: 'rgba(2,8,22,0.95)', backdropFilter: 'blur(20px)' }}>
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="holo-ring w-8 h-8 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'radial-gradient(circle, #00f5ff30, #00f5ff10)', border: '1px solid #00f5ff40' }}>
              <Brain size={10} className="text-cyan" />
            </div>
          </div>
          <div>
            <div className="font-display text-sm font-bold glow-cyan tracking-widest">HYDRA AI</div>
            <div className="text-[9px] font-mono text-secondary">Behavior-Aware Traffic Intelligence</div>
          </div>
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded"
            style={{ background: '#00f5ff08', border: '1px solid #00f5ff20' }}>
            <span className="text-[9px] font-mono text-secondary">HYDERABAD</span>
            <span className="text-[9px] font-mono text-cyan">◉ LIVE</span>
          </div>
        </div>

        {/* Center: Scenario badge */}
        {hasEmergency && (
          <motion.div
            className="hidden md:flex items-center gap-2 px-3 py-1 rounded"
            style={{ background: '#ff2d5510', border: '1px solid #ff2d5560' }}
            animate={{ borderColor: ['#ff2d5540', '#ff2d55', '#ff2d5540'] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <AlertOctagon size={12} className="text-red-400" />
            <span className="text-xs font-mono font-bold text-red-400">EMERGENCY CORRIDOR ACTIVE</span>
          </motion.div>
        )}

        {/* Right: Status + Clock */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <div className="status-dot online" />
            <span className="text-[10px] font-mono text-secondary">AI ENGINE ONLINE</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <Cpu size={10} className="text-cyan" />
            <span className="text-[10px] font-mono text-secondary">YOLOv11 + LSTM</span>
          </div>
          <div className="flex items-center gap-1">
            <Wifi size={10} className="text-green" />
            <span className="text-[10px] font-mono text-secondary">12 feeds</span>
          </div>
          <div className="font-mono text-sm text-cyan font-bold tracking-wider">{clockStr}</div>
        </div>
      </header>

      {/* ── Metrics Bar ── */}
      <div className="px-3 py-2 border-b border-hydra-border flex-shrink-0 overflow-x-auto"
        style={{ background: 'rgba(4,13,26,0.8)' }}>
        <SystemMetrics />
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Panel: Controls */}
        <div className="w-56 flex-shrink-0 border-r border-hydra-border overflow-hidden hidden lg:block">
          <ControlPanel />
        </div>

        {/* Center: Map + Camera */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Map */}
          <div className="flex-1 relative min-h-0">
            <TrafficMap />
            {/* Intersection detail panel (slides over map) */}
            <IntersectionPanel />
          </div>

          {/* Bottom: Camera Feed strip */}
          <div className="flex-shrink-0 border-t border-hydra-border" style={{ height: 220 }}>
            <div className="h-full flex gap-0">
              <div className="w-[320px] flex-shrink-0 border-r border-hydra-border">
                <CameraFeed />
              </div>
              <div className="flex-1 p-3 overflow-y-auto">
                <AlertsPanel />
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Predictions / Alerts */}
        <div className="w-64 flex-shrink-0 border-l border-hydra-border overflow-hidden hidden xl:flex flex-col">
          {/* Tab switcher */}
          <div className="flex border-b border-hydra-border flex-shrink-0">
            {(['alerts', 'predictions', 'camera'] as SideView[]).map(view => (
              <button
                key={view}
                onClick={() => setSideView(view)}
                className={`flex-1 py-2 text-[9px] font-mono uppercase tracking-widest transition-colors ${
                  sideView === view ? 'text-cyan border-b border-cyan-400' : 'text-secondary'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AnimatePresence mode="wait">
              {sideView === 'alerts' && (
                <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AlertsPanel />
                </motion.div>
              )}
              {sideView === 'predictions' && (
                <motion.div key="pred" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <PredictionPanel />
                </motion.div>
              )}
              {sideView === 'camera' && (
                <motion.div key="cam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CameraFeed />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="px-4 py-1.5 border-t border-hydra-border flex items-center justify-between flex-shrink-0"
        style={{ background: 'rgba(2,8,22,0.95)' }}>
        <div className="data-stream text-[9px] w-64">
          HYDRA AI v1.0 · HYDERABAD TRAFFIC INTELLIGENCE SYSTEM · BEHAVIOR-AWARE · PREDICTIVE · REAL-TIME
        </div>
        <div className="flex items-center gap-4 text-[9px] font-mono text-muted">
          <span>YOLOv11 · DeepSORT · LSTM · GNN · RL</span>
          <span>·</span>
          <span>HTRIMS Compatible</span>
          <span>·</span>
          <span className="text-cyan">© 2025 HYDRA AI</span>
        </div>
      </footer>
    </div>
  );
}
