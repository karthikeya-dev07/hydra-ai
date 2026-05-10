'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHydraStore, Intersection, RiskLevel } from '@/lib/store';

// ── Color helpers ─────────────────────────────────────────────
const riskColor = (level: RiskLevel): string => ({
  LOW: '#00ff88', MODERATE: '#00f5ff', HIGH: '#ffcc00', CRITICAL: '#ff2d55',
}[level] || '#00f5ff');

const densityToColor = (d: number): string => {
  if (d > 75) return '#ff2d55';
  if (d > 55) return '#ffcc00';
  if (d > 35) return '#00f5ff';
  return '#00ff88';
};

// ── Hyderabad boundary approx ──
const HYD_CENTER = { lat: 17.3850, lng: 78.4867 };

function latLngToCanvas(
  lat: number, lng: number,
  minLat: number, maxLat: number, minLng: number, maxLng: number,
  W: number, H: number
) {
  const x = ((lng - minLng) / (maxLng - minLng)) * W * 0.85 + W * 0.075;
  const y = ((maxLat - lat) / (maxLat - minLat)) * H * 0.85 + H * 0.075;
  return { x, y };
}

// ── Main Map Component ────────────────────────────────────────
export default function TrafficMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const {
    intersections, selectedIntersection, setSelectedIntersection,
    showHeatmap, showConflictZones, showEmergencyLayer, emergencyCorridors,
  } = useHydraStore();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; fromId: string; color: string }[]>([]);
  const timeRef = useRef(0);

  // Bounds
  const lats = intersections.map(i => i.lat);
  const lngs = intersections.map(i => i.lng);
  const minLat = Math.min(...lats) - 0.02;
  const maxLat = Math.max(...lats) + 0.02;
  const minLng = Math.min(...lngs) - 0.02;
  const maxLng = Math.max(...lngs) + 0.02;

  const toCanvas = useCallback((lat: number, lng: number) =>
    latLngToCanvas(lat, lng, minLat, maxLat, minLng, maxLng, canvasSize.w, canvasSize.h),
    [minLat, maxLat, minLng, maxLng, canvasSize]
  );

  // Resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.parentElement!.getBoundingClientRect();
      setCanvasSize({ w: rect.width, h: rect.height });
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Click/hover detection
  const getIntersectionAtPoint = useCallback((x: number, y: number) => {
    return intersections.find(i => {
      const p = toCanvas(i.lat, i.lng);
      const dx = p.x - x, dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < 20;
    }) || null;
  }, [intersections, toCanvas]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = getIntersectionAtPoint(x, y);
    setSelectedIntersection(hit ? hit.id : null);
  }, [getIntersectionAtPoint, setSelectedIntersection]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = getIntersectionAtPoint(x, y);
    setHoveredId(hit ? hit.id : null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = hit ? 'pointer' : 'default';
    }
  }, [getIntersectionAtPoint]);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const W = canvasSize.w, H = canvasSize.h;

      // Background
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#020816';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(0,245,255,0.04)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // Heatmap layer
      if (showHeatmap) {
        intersections.forEach(i => {
          const p = toCanvas(i.lat, i.lng);
          const r = 60 + i.densityScore * 0.5;
          const alpha = 0.12 + i.densityScore * 0.0015;
          const color = densityToColor(i.densityScore);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
          grad.addColorStop(0, color + Math.round(alpha * 255).toString(16).padStart(2, '0'));
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Road connections
      intersections.forEach((i, idx) => {
        if (idx === 0) return;
        const sameCorr = intersections[idx - 1].corridor === i.corridor;
        if (!sameCorr) return;
        const from = toCanvas(intersections[idx - 1].lat, intersections[idx - 1].lng);
        const to = toCanvas(i.lat, i.lng);

        // Road line
        ctx.strokeStyle = '#0d2137';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();

        // Center line
        ctx.strokeStyle = '#1a3560';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
        ctx.setLineDash([]);

        // Traffic flow particles
        const pct = ((t * 0.3) % 1);
        const px = from.x + (to.x - from.x) * pct;
        const py = from.y + (to.y - from.y) * pct;
        const density = (i.densityScore + intersections[idx - 1].densityScore) / 2;
        const pColor = densityToColor(density);
        ctx.fillStyle = pColor + 'cc';
        ctx.shadowBlur = 6; ctx.shadowColor = pColor;
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fill();
        // Second particle offset
        const pct2 = ((t * 0.3 + 0.5) % 1);
        const px2 = from.x + (to.x - from.x) * pct2;
        const py2 = from.y + (to.y - from.y) * pct2;
        ctx.beginPath(); ctx.arc(px2, py2, 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Emergency corridor highlight
      if (showEmergencyLayer) {
        emergencyCorridors.filter(e => e.active).forEach(corridor => {
          const routeIntersections = corridor.route.map(id => intersections.find(i => i.id === id)).filter(Boolean) as Intersection[];
          for (let k = 0; k < routeIntersections.length - 1; k++) {
            const from = toCanvas(routeIntersections[k].lat, routeIntersections[k].lng);
            const to = toCanvas(routeIntersections[k + 1].lat, routeIntersections[k + 1].lng);
            const pulse = 0.6 + 0.4 * Math.sin(t * 6);

            ctx.strokeStyle = `rgba(255, 45, 85, ${pulse})`;
            ctx.lineWidth = 4;
            ctx.shadowBlur = 20; ctx.shadowColor = '#ff2d55';
            ctx.setLineDash([15, 8]);
            ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
          }

          // Moving ambulance indicator
          if (routeIntersections.length > 1) {
            const segIdx = Math.floor((t * 0.15) % (routeIntersections.length - 1));
            const segPct = ((t * 0.15) % 1);
            const from = toCanvas(routeIntersections[segIdx].lat, routeIntersections[segIdx].lng);
            const to = toCanvas(routeIntersections[Math.min(segIdx + 1, routeIntersections.length - 1)].lat, routeIntersections[Math.min(segIdx + 1, routeIntersections.length - 1)].lng);
            const ax = from.x + (to.x - from.x) * segPct;
            const ay = from.y + (to.y - from.y) * segPct;
            ctx.fillStyle = '#ff2d55';
            ctx.shadowBlur = 16; ctx.shadowColor = '#ff2d55';
            ctx.beginPath(); ctx.arc(ax, ay, 6, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
      }

      // Conflict zone indicators
      if (showConflictZones) {
        intersections.filter(i => i.conflictScore > 50).forEach(i => {
          const p = toCanvas(i.lat, i.lng);
          const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.5));
          ctx.strokeStyle = `rgba(255, 107, 53, ${pulse})`;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(p.x, p.y, 28 + Math.sin(t * 3) * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // Intersection nodes
      intersections.forEach(i => {
        const p = toCanvas(i.lat, i.lng);
        const isSelected = i.id === selectedIntersection;
        const isHovered = i.id === hoveredId;
        const isEmergency = i.isEmergency;

        const signalColor = i.currentSignal === 'GREEN' ? '#00cc44' : i.currentSignal === 'YELLOW' ? '#ffcc00' : '#ff2d55';
        const r = isSelected ? 14 : isHovered ? 12 : 10;

        // Outer ring glow
        if (isSelected || isHovered) {
          ctx.strokeStyle = signalColor + '60';
          ctx.lineWidth = 8;
          ctx.beginPath(); ctx.arc(p.x, p.y, r + 8, 0, Math.PI * 2); ctx.stroke();
        }

        // Pulse ring for emergencies
        if (isEmergency) {
          const pr = 18 + Math.sin(t * 8) * 6;
          ctx.strokeStyle = `rgba(255, 45, 85, ${0.5 + 0.5 * Math.sin(t * 8)})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, Math.PI * 2); ctx.stroke();
        }

        // Node body
        ctx.fillStyle = '#040d1a';
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();

        // Signal color ring
        ctx.strokeStyle = signalColor;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.shadowBlur = isSelected ? 20 : 10;
        ctx.shadowColor = signalColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0;

        // Inner dot
        ctx.fillStyle = signalColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2); ctx.fill();

        // Label
        const showLabel = isSelected || isHovered || i.stressIndex > 70;
        if (showLabel) {
          const nameWords = i.name.split(' ').slice(0, 2).join(' ');
          ctx.fillStyle = isSelected ? '#00f5ff' : '#6b8db0';
          ctx.font = `${isSelected ? 'bold ' : ''}11px JetBrains Mono, monospace`;
          ctx.textAlign = 'center';
          ctx.fillText(nameWords, p.x, p.y - r - 8);

          if (isSelected || isHovered) {
            ctx.fillStyle = densityToColor(i.densityScore);
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.fillText(`D:${Math.round(i.densityScore)} S:${Math.round(i.stressIndex)}`, p.x, p.y + r + 16);
          }
        }
      });

      // Corridor labels
      const corridors = Array.from(new Set(intersections.map(i => i.corridor).filter(Boolean))) as string[];
      corridors.forEach(corridor => {
        const group = intersections.filter(i => i.corridor === corridor);
        if (group.length === 0) return;
        const cx = group.reduce((s, i) => s + toCanvas(i.lat, i.lng).x, 0) / group.length;
        const cy = group.reduce((s, i) => s + toCanvas(i.lat, i.lng).y, 0) / group.length - 35;
        ctx.fillStyle = 'rgba(0,245,255,0.3)';
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(corridor.toUpperCase(), cx, cy);
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [intersections, selectedIntersection, hoveredId, showHeatmap, showConflictZones, showEmergencyLayer, emergencyCorridors, toCanvas, canvasSize]);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {/* Map overlays */}
      <div className="absolute top-3 left-3 flex flex-col gap-1">
        {/* Legend */}
        <div className="glass-panel px-3 py-2 rounded-md text-xs font-mono space-y-1">
          <div className="text-secondary mb-1 font-bold text-[10px]">SIGNAL STATES</div>
          {[['GREEN', '#00cc44'], ['YELLOW', '#ffcc00'], ['RED', '#ff2d55']].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
              <span className="text-secondary text-[10px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoveredId && hoveredId !== selectedIntersection && (() => {
          const i = intersections.find(x => x.id === hoveredId);
          if (!i) return null;
          const p = toCanvas(i.lat, i.lng);
          return (
            <motion.div
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute pointer-events-none glass-panel rounded-md px-3 py-2 text-xs font-mono min-w-[160px]"
              style={{ left: p.x + 16, top: p.y - 20 }}
            >
              <div className="text-cyan font-bold mb-1">{i.name}</div>
              <div className="text-secondary">Density: <span style={{ color: densityToColor(i.densityScore) }}>{Math.round(i.densityScore)}%</span></div>
              <div className="text-secondary">Signal: <span style={{ color: i.currentSignal === 'GREEN' ? '#00cc44' : i.currentSignal === 'YELLOW' ? '#ffcc00' : '#ff2d55' }}>{i.currentSignal}</span></div>
              <div className="text-secondary">Queue: {i.queueLength} veh</div>
              <div className="text-[10px] text-muted mt-1">Click for details</div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Scale indicator */}
      <div className="absolute bottom-3 right-3 glass-panel px-3 py-1.5 rounded text-[10px] font-mono text-secondary">
        📍 Hyderabad, India — {intersections.length} intersections monitored
      </div>
    </div>
  );
}
