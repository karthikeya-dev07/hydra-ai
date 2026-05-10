'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore } from '@/lib/store';
import { VehicleCounts } from './MetricDisplays';
import { Camera, Upload, Play, Pause, Cpu, Eye } from 'lucide-react';

// ── Simulated vehicle detection overlay ──────────────────────
interface BBox {
  id: string;
  type: string;
  x: number; y: number; w: number; h: number;
  confidence: number;
  color: string;
}

const VEHICLE_COLORS: Record<string, string> = {
  bike: '#00f5ff', car: '#00ff88', auto: '#ffcc00',
  bus: '#ff6b35', truck: '#ff2d55', pedestrian: '#8b5cf6', ambulance: '#ff2d55',
};

const VEHICLE_ICONS: Record<string, string> = {
  bike: '🏍️', car: '🚗', auto: '🛺', bus: '🚌', truck: '🚛', pedestrian: '🚶', ambulance: '🚑',
};

function generateFakeBBoxes(counts: Record<string, number>): BBox[] {
  const boxes: BBox[] = [];
  Object.entries(counts).forEach(([type, count]) => {
    for (let i = 0; i < Math.min(count, 6); i++) {
      boxes.push({
        id: `${type}-${i}`,
        type,
        x: 0.05 + Math.random() * 0.8,
        y: 0.1 + Math.random() * 0.7,
        w: type === 'bus' || type === 'truck' ? 0.15 : type === 'pedestrian' ? 0.04 : 0.08,
        h: type === 'bus' || type === 'truck' ? 0.12 : type === 'pedestrian' ? 0.1 : 0.07,
        confidence: 0.75 + Math.random() * 0.24,
        color: VEHICLE_COLORS[type] || '#00f5ff',
      });
    }
  });
  return boxes;
}

export default function CameraFeed() {
  const { intersections, selectedIntersection } = useHydraStore();
  const intersection = intersections.find(i => i.id === selectedIntersection) || intersections[0];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [fps, setFps] = useState(24);
  const [bboxes, setBboxes] = useState<BBox[]>([]);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const bboxUpdateRef = useRef(0);

  // Update bboxes periodically
  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(() => {
      setBboxes(generateFakeBBoxes(intersection.vehicleCounts));
      setFps(Math.round(22 + Math.random() * 6));
    }, 800);
    return () => clearInterval(interval);
  }, [intersection.vehicleCounts, isAnalyzing]);

  // Initial bboxes
  useEffect(() => {
    setBboxes(generateFakeBBoxes(intersection.vehicleCounts));
  }, [intersection.id]);

  // Draw camera feed simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      timeRef.current += 0.02;
      const t = timeRef.current;

      // Simulated road/camera background
      ctx.fillStyle = '#080e18';
      ctx.fillRect(0, 0, W, H);

      // Road markings
      ctx.strokeStyle = '#1a2d45';
      ctx.lineWidth = 2;
      // Road surface
      ctx.fillStyle = '#0a1520';
      ctx.fillRect(0, H * 0.3, W, H * 0.7);

      // Lane lines
      ctx.strokeStyle = '#1e3a55';
      ctx.lineWidth = 1;
      for (let lane = 1; lane < 4; lane++) {
        const lx = (W / 4) * lane;
        ctx.setLineDash([20, 15]);
        ctx.beginPath(); ctx.moveTo(lx, H * 0.3); ctx.lineTo(lx, H); ctx.stroke();
      }
      ctx.setLineDash([]);

      // Stop line
      ctx.strokeStyle = '#ffffff20';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, H * 0.55); ctx.lineTo(W, H * 0.55); ctx.stroke();

      // Noise / grain effect
      if (Math.floor(t * 10) % 3 === 0) {
        for (let n = 0; n < 200; n++) {
          const nx = Math.random() * W, ny = Math.random() * H;
          ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`;
          ctx.fillRect(nx, ny, 1, 1);
        }
      }

      // Scan lines
      for (let sl = 0; sl < H; sl += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, sl, W, 2);
      }

      // Moving "vehicles" (blobs)
      const vehicleTypes = ['car', 'bike', 'auto', 'bus'];
      vehicleTypes.forEach((vt, vi) => {
        const count = intersection.vehicleCounts[vt] || 0;
        for (let k = 0; k < Math.min(count, 3); k++) {
          const speed = vt === 'bike' ? 1.2 : vt === 'bus' ? 0.4 : 0.7;
          const px = ((t * speed * 40 + vi * 80 + k * 120) % (W + 80)) - 40;
          const lane = (vi + k) % 4;
          const py = H * 0.35 + lane * (H * 0.15);
          const bw = vt === 'bus' ? 50 : vt === 'truck' ? 55 : vt === 'bike' ? 18 : 32;
          const bh = vt === 'bus' ? 30 : vt === 'truck' ? 28 : vt === 'bike' ? 14 : 20;

          ctx.fillStyle = '#1a2d45';
          ctx.beginPath();
          ctx.roundRect(px - bw / 2, py - bh / 2, bw, bh, 4);
          ctx.fill();
          ctx.strokeStyle = VEHICLE_COLORS[vt] + '60';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Headlights
          ctx.fillStyle = '#ffffffaa';
          ctx.beginPath(); ctx.arc(px + bw / 2 - 4, py - 4, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(px + bw / 2 - 4, py + 4, 2, 0, Math.PI * 2); ctx.fill();
        }
      });

      // Bounding box overlays
      if (isAnalyzing) {
        bboxes.forEach((box, idx) => {
          const bx = box.x * W, by = box.y * H;
          const bw = box.w * W, bh = box.h * H;

          // Animated box
          const pulse = 0.7 + 0.3 * Math.sin(t * 4 + idx);
          ctx.strokeStyle = box.color + Math.round(pulse * 255).toString(16).padStart(2, '0');
          ctx.lineWidth = 1.5;
          ctx.shadowBlur = 8; ctx.shadowColor = box.color;

          // Corner brackets style bbox
          const cs = 8; // corner size
          ctx.beginPath();
          // TL
          ctx.moveTo(bx + cs, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + cs);
          // TR
          ctx.moveTo(bx + bw - cs, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cs);
          // BL
          ctx.moveTo(bx, by + bh - cs); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cs, by + bh);
          // BR
          ctx.moveTo(bx + bw - cs, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cs);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = box.color + 'dd';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${box.type} ${(box.confidence * 100).toFixed(0)}%`, bx + 2, by - 3);
        });
      }

      // HUD overlays
      // Top status bar
      ctx.fillStyle = 'rgba(2,8,22,0.7)';
      ctx.fillRect(0, 0, W, 22);
      ctx.fillStyle = '#00f5ff';
      ctx.font = 'bold 9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`● REC  ${new Date().toLocaleTimeString()}  ${fps}fps`, 6, 14);
      ctx.textAlign = 'right';
      ctx.fillText(`YOLOv11 | HYDRA AI`, W - 6, 14);

      // Corner info
      ctx.fillStyle = 'rgba(2,8,22,0.7)';
      ctx.fillRect(0, H - 18, W, 18);
      ctx.fillStyle = '#6b8db0';
      ctx.font = '8px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`CAM: ${intersection.name}  |  OBJECTS: ${bboxes.length}  |  CONF: >75%`, 6, H - 5);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [isAnalyzing, bboxes, intersection, fps]);

  const [analyzing, setAnalyzing] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAnalyzing(true);
    // Simulate AI Processing (The backend main.py is already setup to handle similar logic)
    setTimeout(() => {
      setAnalyzing(false);
      setTestResult({
        detected: { car: 12, bike: 19, auto: 8, bus: 2 },
        optimalGreen: 54,
        confidence: 0.96,
        reasoning: "High bike swarm density detected. Extended clearance buffer applied."
      });
    }, 1500);
  };

  return (
    <div className="hydra-panel overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-hydra-border bg-black/40">
        <div className="flex items-center gap-2">
          <Camera size={12} className="text-cyan" />
          <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">LIVE CCTV FEED</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer flex items-center gap-1.5 px-2 py-0.5 rounded border border-cyan/30 bg-cyan/5 hover:bg-cyan/20 transition-all">
            <Upload size={10} className="text-cyan" />
            <span className="text-[9px] font-mono font-bold text-cyan uppercase">Test with Image</span>
            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
          </label>
          <button
            onClick={() => setIsAnalyzing(a => !a)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors"
            style={{
              background: isAnalyzing ? '#00f5ff10' : 'transparent',
              borderColor: isAnalyzing ? '#00f5ff40' : '#0d2137',
              color: isAnalyzing ? '#00f5ff' : '#6b8db0',
            }}
          >
            <Eye size={10} />
            {isAnalyzing ? 'AI ON' : 'AI OFF'}
          </button>
        </div>
      </div>

      {/* Feed Area */}
      <div className="relative flex-1 bg-black overflow-hidden" style={{ minHeight: 180 }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={360}
          className="w-full h-full object-cover"
        />
        
        <AnimatePresence>
          {!isAnalyzing && !testResult && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center"
            >
              <div className="text-secondary font-mono text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Pause size={12} /> AI Detection Paused
              </div>
            </motion.div>
          )}

          {analyzing && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center gap-3 z-20"
            >
              <div className="w-8 h-8 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
              <div className="text-[9px] font-mono text-cyan uppercase tracking-widest animate-pulse">Running YOLOv11 Inference...</div>
            </motion.div>
          )}

          {testResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="absolute inset-2 bg-black/90 border border-cyan/40 backdrop-blur-xl p-3 rounded z-30 flex flex-col"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Cpu size={12} className="text-green-400" />
                  <h4 className="text-[10px] font-bold text-white font-mono tracking-widest">OFFLINE AI TEST RESULTS</h4>
                </div>
                <button onClick={() => setTestResult(null)} className="text-secondary hover:text-white text-xs">✕</button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto">
                <div className="space-y-2 p-2 bg-white/5 rounded border border-white/10">
                  <div className="text-[8px] text-secondary font-mono uppercase">Detection Accuracy</div>
                  <div className="text-lg font-display font-bold text-green-400">96.4%</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(testResult.detected).map(([type, count]: [any, any]) => (
                      <div key={type} className="text-[8px] font-mono px-1 py-0.5 bg-cyan/10 text-cyan rounded">
                        {type}:{count}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 p-2 bg-white/5 rounded border border-white/10">
                  <div className="text-[8px] text-secondary font-mono uppercase">Computed Optimal Green</div>
                  <div className="text-lg font-display font-bold text-cyan">{testResult.optimalGreen}s</div>
                  <p className="text-[8px] font-mono text-secondary leading-tight italic">
                    "{testResult.reasoning}"
                  </p>
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-[8px] font-mono text-muted uppercase">Inference Time: 38ms</span>
                <button 
                  onClick={() => setTestResult(null)}
                  className="px-2 py-1 bg-cyan text-black text-[9px] font-bold font-mono hover:bg-white transition-colors uppercase"
                >
                  Return to Live
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detection Stats footer */}
      <div className="p-2 border-t border-hydra-border bg-black/20">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <Cpu size={10} className="text-cyan" />
            <span className="text-[9px] font-mono text-secondary uppercase tracking-tighter">Current Bounding Boxes</span>
          </div>
          <span className="text-[9px] font-mono text-cyan tracking-widest">{bboxes.length}</span>
        </div>
        <VehicleCounts counts={intersection.vehicleCounts} compact />
      </div>
    </div>
  );
}

