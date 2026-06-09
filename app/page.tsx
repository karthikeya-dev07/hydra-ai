'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import {
  Brain, Activity, AlertTriangle, Wifi, Play, Pause,
  ChevronRight, Navigation2, Clock, Zap
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
  const { tickSimulation, isSimulationRunning, toggleSimulation, activeScenario, emergencyCorridors, systemMetrics } = useHydraStore();
  const tickRef = useRef<NodeJS.Timeout | null>(null);
  const [sideView, setSideView] = useState<SideView>('alerts');
  const [clockStr, setClockStr] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    const update = () => setClockStr(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const hasEmergency = emergencyCorridors.some(e => e.active);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="scan-line" />

      {/* ── Navbar ── */}
      <header className="navbar flex items-center justify-between px-5 py-3 flex-shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)' }}>
            <Brain size={18} color="white" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-white tracking-tight">HYDRA AI</div>
            <div className="text-[10px] text-secondary">Traffic Intelligence · Hyderabad</div>
          </div>
        </div>

        {/* Emergency Banner */}
        <AnimatePresence>
          {hasEmergency && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl emergency-active"
              style={{ background: '#f8717110', border: '1px solid #f8717150' }}
            >
              <span className="text-red-400 font-bold text-xs">🚨 EMERGENCY CORRIDOR ACTIVE</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right */}
        <div className="flex items-center gap-4">
          {/* Sim Toggle */}
          <button
            id="sim-toggle-btn"
            onClick={toggleSimulation}
            className="btn btn-secondary flex items-center gap-2 text-xs"
          >
            {isSimulationRunning ? <><Pause size={13} /> Pause</> : <><Play size={13} /> Resume</>}
          </button>
          {/* Status */}
          <div className="hidden md:flex items-center gap-2">
            <div className="status-dot online" />
            <span className="text-xs text-secondary font-medium">AI Live</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-secondary">
            <Wifi size={13} />
            <span className="text-xs">12 feeds</span>
          </div>
          <div className="flex items-center gap-1.5 text-white">
            <Clock size={13} className="text-secondary" />
            <span className="text-sm font-semibold">{mounted ? clockStr : ''}</span>
          </div>
        </div>
      </header>

      {/* ── Metrics Bar ── */}
      <div className="flex-shrink-0 border-b px-4 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <SystemMetrics />
      </div>

      {/* ── Main Layout ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-60 flex-shrink-0 sidebar overflow-hidden hidden lg:flex flex-col">
          <ControlPanel />
        </div>

        {/* Center: Map + Camera */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Map */}
          <div className="flex-1 relative min-h-0">
            <TrafficMap />
            <IntersectionPanel />
          </div>

          {/* Bottom Strip: Camera + Alerts */}
          <div className="flex-shrink-0 border-t" style={{ borderColor: 'var(--border)', height: 220 }}>
            <div className="h-full flex">
              <div className="w-[300px] flex-shrink-0 border-r" style={{ borderColor: 'var(--border)' }}>
                <CameraFeed />
              </div>
              <div className="flex-1 p-3 overflow-y-auto" style={{ background: 'var(--bg-secondary)' }}>
                <AlertsPanel />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-64 flex-shrink-0 border-l hidden xl:flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          {/* Tab Bar */}
          <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <div className="tab-bar">
              {(['alerts', 'predictions', 'camera'] as SideView[]).map(view => (
                <button
                  key={view}
                  id={`side-tab-${view}`}
                  onClick={() => setSideView(view)}
                  className={`tab-btn ${sideView === view ? 'active' : ''}`}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <AnimatePresence mode="wait">
              {sideView === 'alerts' && (
                <motion.div key="alerts" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                  <AlertsPanel />
                </motion.div>
              )}
              {sideView === 'predictions' && (
                <motion.div key="pred" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                  <PredictionPanel />
                </motion.div>
              )}
              {sideView === 'camera' && (
                <motion.div key="cam" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
                  <CameraFeed />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="px-5 py-2 border-t flex items-center justify-between flex-shrink-0 text-xs text-secondary"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <span className="flex items-center gap-2">
          <Zap size={11} className="text-cyan" />
          HYDRA AI v1.0 · Behavior-Aware Traffic Intelligence
        </span>
        <span className="hidden md:block">YOLOv11 · DeepSORT · LSTM · GNN · RL · HTRIMS Compatible</span>
        <span style={{ color: 'var(--cyan)' }}>© 2025 HYDRA AI</span>
      </footer>
    </div>
  );
}
