// ═══════════════════════════════════════════════════════════
//  HYDRA AI — Central Zustand Store
//  Real-time traffic state, AI decisions, signals, incidents
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';

// ── Types ──────────────────────────────────────────────────
export type SignalState = 'RED' | 'YELLOW' | 'GREEN';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type VehicleType = 'bike' | 'car' | 'auto' | 'bus' | 'truck' | 'pedestrian' | 'ambulance';

export interface DetectedVehicle {
  id: string;
  type: VehicleType;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h (0-1 normalized)
  trackId: number;
}

export interface ConflictZone {
  id: string;
  type: 'stop-line-violation' | 'lane-intrusion' | 'wrong-side' | 'blocked-left' | 'bike-swarm' | 'merge-aggression';
  severity: number; // 0-100
  location: { x: number; y: number };
}

export interface Intersection {
  id: string;
  name: string;
  lat: number;
  lng: number;
  currentSignal: SignalState;
  greenDuration: number;       // seconds
  redDuration: number;
  countdown: number;           // seconds remaining
  densityScore: number;        // 0-100
  stressIndex: number;         // 0-100
  spilloverRisk: number;       // 0-100
  gridlockProbability: number; // 0-100
  conflictScore: number;       // 0-100
  queueLength: number;         // vehicles
  queueGrowthRate: number;     // vehicles per min
  detectedVehicles: DetectedVehicle[];
  conflictZones: ConflictZone[];
  aiReasoning: string;
  isEmergency: boolean;
  emergencyType?: string;
  predictedCongestion: RiskLevel;
  corridor?: string;
  vehicleCounts: Record<VehicleType, number>;
  historicalData: { time: number; density: number; stress: number }[];
}

export interface EmergencyCorridorEvent {
  id: string;
  type: 'ambulance' | 'fire' | 'police';
  route: string[];            // intersection IDs
  estimatedClearTime: number; // seconds
  active: boolean;
  detectedAt: number;         // timestamp
}

export interface CongestionPrediction {
  intersectionId: string;
  riskLevel: RiskLevel;
  minutesAhead: number;
  confidence: number;
  reason: string;
}

export interface AIAlert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'emergency';
  message: string;
  intersectionId?: string;
  timestamp: number;
  acknowledged: boolean;
}

export interface SystemMetrics {
  averageWaitTime: number;    // seconds
  throughputRate: number;     // vehicles/min
  activeIncidents: number;
  emergenciesHandled: number;
  signalEfficiency: number;   // %
  networkStress: number;      // 0-100
  fuelSaved: number;          // liters (estimated)
  co2Reduced: number;         // kg (estimated)
}

export interface HydraStore {
  // ── State ──
  intersections: Intersection[];
  selectedIntersection: string | null;
  emergencyCorridors: EmergencyCorridorEvent[];
  predictions: CongestionPrediction[];
  alerts: AIAlert[];
  systemMetrics: SystemMetrics;
  isSimulationRunning: boolean;
  simulationSpeed: number; // 1x, 2x, 4x
  showHeatmap: boolean;
  showConflictZones: boolean;
  showPredictions: boolean;
  showEmergencyLayer: boolean;
  activeScenario: 'normal' | 'peak-hour' | 'accident' | 'ambulance-crisis';

  // ── Actions ──
  setSelectedIntersection: (id: string | null) => void;
  toggleSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  updateIntersection: (id: string, data: Partial<Intersection>) => void;
  triggerEmergency: (corridorIds: string[]) => void;
  clearEmergency: (corridorId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  addAlert: (alert: Omit<AIAlert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  setScenario: (scenario: HydraStore['activeScenario']) => void;
  toggleLayer: (layer: 'heatmap' | 'conflict' | 'predictions' | 'emergency') => void;
  tickSimulation: () => void;
}

// ── Hyderabad Intersection Data ─────────────────────────────
const VEHICLE_WEIGHTS: Record<VehicleType, number> = {
  bike: 1, car: 2, auto: 2, bus: 5, truck: 6, pedestrian: 0.5, ambulance: 0,
};

function computeDensityScore(counts: Record<VehicleType, number>): number {
  const weighted = Object.entries(counts).reduce((sum, [type, count]) => {
    return sum + (VEHICLE_WEIGHTS[type as VehicleType] || 1) * count;
  }, 0);
  return Math.min(100, (weighted / 1.2));
}

function generateAIReasoning(intersection: Intersection): string {
  const { densityScore, stressIndex, spilloverRisk, queueGrowthRate, isEmergency, conflictScore } = intersection;

  if (isEmergency) return '🚨 EMERGENCY OVERRIDE: Ambulance detected. Green corridor activated. All feeder signals synchronized.';
  if (gridlockWarning(stressIndex)) return `⚠️ Gridlock probability HIGH (${stressIndex}%). Extended green by ${Math.round(stressIndex * 0.4)}s. Upstream signals pre-cleared.`;
  if (spilloverRisk > 70) return `🔴 Spillover risk CRITICAL. Queue growth: +${queueGrowthRate.toFixed(1)} veh/min. Reducing cycle to flush queue.`;
  if (conflictScore > 65) return `⚡ High conflict zone detected. Bike swarm forming. Added ${Math.round(conflictScore * 0.2)}s buffer for merge clearance.`;
  if (densityScore > 75) return `📊 High density score (${densityScore.toFixed(0)}). Extending green by ${Math.round((densityScore - 50) * 0.6)}s. Downstream signal pre-greened.`;
  if (densityScore < 30) return `✅ Low traffic density (${densityScore.toFixed(0)}). Cycle shortened by 12s. Neighboring corridors balanced.`;
  return `🤖 AI Adaptive: Density ${densityScore.toFixed(0)}% | Queue ${intersection.queueLength} veh | Optimal cycle computed.`;
}

function gridlockWarning(stress: number) { return stress > 80; }

function computeGreenDuration(intersection: Intersection): number {
  const BASE = 30;
  const alpha = 0.5;  // density coefficient
  const beta = 2.0;   // queue growth coefficient
  const gamma = 60;   // emergency bonus

  const density = intersection.densityScore;
  const queueGrowth = intersection.queueGrowthRate;
  const emergency = intersection.isEmergency ? 1 : 0;

  const duration = BASE + alpha * density + beta * queueGrowth + gamma * emergency;
  return Math.max(15, Math.min(120, Math.round(duration)));
}

function randomVehicleCounts(scenario: string, baseMultiplier = 1): Record<VehicleType, number> {
  const m = baseMultiplier;
  const isPeak = scenario === 'peak-hour' || scenario === 'ambulance-crisis';
  const isAccident = scenario === 'accident';

  // Use fixed values for initial hydration to prevent SSR mismatch
  return {
    bike: Math.round((isPeak ? 25 : 12) * m + 5),
    car: Math.round((isPeak ? 18 : 8) * m + 3),
    auto: Math.round((isPeak ? 12 : 5) * m + 2),
    bus: Math.round((isPeak ? 4 : 2) * m + 1),
    truck: Math.round((isAccident ? 0 : 2) * m + 1),
    pedestrian: Math.round((isPeak ? 20 : 8) * m + 4),
    ambulance: 0,
  };
}

function makeIntersection(
  id: string, name: string, lat: number, lng: number,
  corridor: string, scenario = 'normal'
): Intersection {
  const counts = randomVehicleCounts(scenario);
  const density = computeDensityScore(counts);
  const stress = Math.min(100, density + Math.random() * 20 - 5);
  const spillover = Math.min(100, stress * 0.9 + Math.random() * 15);

  const base: Intersection = {
    id, name, lat, lng, corridor,
    currentSignal: 'RED',
    greenDuration: 45,
    redDuration: 60,
    countdown: 30,
    densityScore: density,
    stressIndex: stress,
    spilloverRisk: spillover,
    gridlockProbability: Math.max(0, stress - 30) * 1.5,
    conflictScore: 40,
    queueLength: Math.round(counts.bike + counts.car + counts.auto + counts.bus),
    queueGrowthRate: 1.2,
    detectedVehicles: [],
    conflictZones: [],
    aiReasoning: '',
    isEmergency: false,
    predictedCongestion: density > 75 ? 'HIGH' : density > 50 ? 'MODERATE' : 'LOW',
    vehicleCounts: counts,
    historicalData: Array.from({ length: 20 }, (_, i) => ({
      time: Date.now() - (20 - i) * 60000,
      density: density,
      stress: stress,
    })),
  };

  base.greenDuration = computeGreenDuration(base);
  base.aiReasoning = generateAIReasoning(base);
  return base;
}

const INITIAL_INTERSECTIONS: Intersection[] = [
  makeIntersection('gachibowli-main', 'Gachibowli Junction', 17.4401, 78.3489, 'Gachibowli Corridor'),
  makeIntersection('hitech-flyover', 'HiTech City Flyover', 17.4486, 78.3762, 'HiTech Corridor'),
  makeIntersection('kondapur-x', 'Kondapur X Roads', 17.4590, 78.3619, 'HiTech Corridor'),
  makeIntersection('madhapur-main', 'Madhapur Main', 17.4492, 78.3942, 'HiTech Corridor'),
  makeIntersection('jubilee-hills', 'Jubilee Hills Check Post', 17.4312, 78.4050, 'Jubilee Corridor'),
  makeIntersection('banjara-hills', 'Banjara Hills Road No.12', 17.4157, 78.4483, 'Jubilee Corridor'),
  makeIntersection('panjagutta', 'Panjagutta Circle', 17.4239, 78.4481, 'Jubilee Corridor'),
  makeIntersection('ameerpet', 'Ameerpet Metro', 17.4374, 78.4482, 'Metro Corridor'),
  makeIntersection('sr-nagar', 'SR Nagar Junction', 17.4528, 78.4427, 'Metro Corridor'),
  makeIntersection('begumpet', 'Begumpet Signal', 17.4432, 78.4687, 'Airport Corridor'),
  makeIntersection('secunderabad-main', 'Secunderabad Clock Tower', 17.4399, 78.4983, 'Airport Corridor'),
  makeIntersection('lb-nagar', 'LB Nagar Junction', 17.3476, 78.5479, 'ORR East'),
];

// ── Store ───────────────────────────────────────────────────
export const useHydraStore = create<HydraStore>((set, get) => ({
  intersections: INITIAL_INTERSECTIONS,
  selectedIntersection: null,
  emergencyCorridors: [],
  predictions: INITIAL_INTERSECTIONS.map(i => ({
    intersectionId: i.id,
    riskLevel: i.predictedCongestion,
    minutesAhead: Math.round(2 + Math.random() * 8),
    confidence: Math.round(65 + Math.random() * 30),
    reason: i.densityScore > 70 ? 'High vehicle density + queue growth' : 'Normal traffic patterns',
  })),
  alerts: [
    { id: 'a1', type: 'warning', message: 'Bike swarm detected at Gachibowli Junction — conflict score rising', intersectionId: 'gachibowli-main', timestamp: Date.now() - 120000, acknowledged: false },
    { id: 'a2', type: 'critical', message: 'Spillover risk CRITICAL at HiTech Flyover', intersectionId: 'hitech-flyover', timestamp: Date.now() - 60000, acknowledged: false },
    { id: 'a3', type: 'info', message: 'Green wave synchronized across Jubilee Corridor (3 signals)', timestamp: Date.now() - 30000, acknowledged: false },
  ],
  systemMetrics: {
    averageWaitTime: 42,
    throughputRate: 148,
    activeIncidents: 2,
    emergenciesHandled: 7,
    signalEfficiency: 78,
    networkStress: 61,
    fuelSaved: 234,
    co2Reduced: 187,
  },
  isSimulationRunning: true,
  simulationSpeed: 1,
  showHeatmap: true,
  showConflictZones: true,
  showPredictions: true,
  showEmergencyLayer: true,
  activeScenario: 'normal',

  setSelectedIntersection: (id) => set({ selectedIntersection: id }),

  toggleSimulation: () => set(s => ({ isSimulationRunning: !s.isSimulationRunning })),

  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  updateIntersection: (id, data) => set(s => ({
    intersections: s.intersections.map(i => i.id === id ? { ...i, ...data } : i),
  })),

  triggerEmergency: (corridorIds) => {
    const corridorEvent: EmergencyCorridorEvent = {
      id: `emg-${Date.now()}`,
      type: 'ambulance',
      route: corridorIds,
      estimatedClearTime: 90,
      active: true,
      detectedAt: Date.now(),
    };
    set(s => ({
      emergencyCorridors: [...s.emergencyCorridors, corridorEvent],
      intersections: s.intersections.map(i =>
        corridorIds.includes(i.id)
          ? { ...i, isEmergency: true, currentSignal: 'GREEN', countdown: 90, aiReasoning: generateAIReasoning({ ...i, isEmergency: true }) }
          : i
      ),
    }));
    get().addAlert({ type: 'emergency', message: '🚨 AMBULANCE DETECTED — Emergency green corridor activated across ' + corridorIds.length + ' intersections', });
  },

  clearEmergency: (corridorId) => set(s => ({
    emergencyCorridors: s.emergencyCorridors.map(e => e.id === corridorId ? { ...e, active: false } : e),
    intersections: s.intersections.map(i => ({ ...i, isEmergency: false })),
  })),

  acknowledgeAlert: (alertId) => set(s => ({
    alerts: s.alerts.map(a => a.id === alertId ? { ...a, acknowledged: true } : a),
  })),

  addAlert: (alert) => set(s => ({
    alerts: [
      { ...alert, id: `alert-${Date.now()}`, timestamp: Date.now(), acknowledged: false },
      ...s.alerts.slice(0, 19),
    ],
  })),

  setScenario: (scenario) => {
    set({ activeScenario: scenario });
    // Rebuild intersections for scenario
    const newIntersections = INITIAL_INTERSECTIONS.map(base => {
      const multiplier = scenario === 'peak-hour' ? 1.8 : scenario === 'accident' ? 1.4 : scenario === 'ambulance-crisis' ? 2.0 : 1.0;
      const counts = randomVehicleCounts(scenario, multiplier);
      const density = computeDensityScore(counts);
      const stress = Math.min(100, density + Math.random() * 20);
      const updated: Intersection = {
        ...base,
        vehicleCounts: counts,
        densityScore: density,
        stressIndex: stress,
        spilloverRisk: Math.min(100, stress * 0.95),
        queueLength: Math.round(Object.values(counts).reduce((a, b) => a + b, 0) * 0.6),
        queueGrowthRate: parseFloat((Math.random() * (scenario === 'peak-hour' ? 8 : 3)).toFixed(1)),
        predictedCongestion: density > 75 ? 'CRITICAL' : density > 55 ? 'HIGH' : density > 35 ? 'MODERATE' : 'LOW',
      };
      updated.greenDuration = computeGreenDuration(updated);
      updated.aiReasoning = generateAIReasoning(updated);
      return updated;
    });

    // For ambulance crisis: trigger emergency on first 4 intersections
    if (scenario === 'ambulance-crisis') {
      const emergencyRoute = ['gachibowli-main', 'kondapur-x', 'madhapur-main', 'hitech-flyover'];
      const corridorEvent: EmergencyCorridorEvent = {
        id: `emg-scenario-${Date.now()}`,
        type: 'ambulance',
        route: emergencyRoute,
        estimatedClearTime: 120,
        active: true,
        detectedAt: Date.now(),
      };
      set(s => ({
        intersections: newIntersections.map(i =>
          emergencyRoute.includes(i.id)
            ? { ...i, isEmergency: true, currentSignal: 'GREEN', vehicleCounts: { ...i.vehicleCounts, ambulance: 1 }, aiReasoning: '🚨 EMERGENCY OVERRIDE: Ambulance detected. Green corridor activated.' }
            : i
        ),
        emergencyCorridors: [corridorEvent, ...s.emergencyCorridors.slice(0, 4)],
      }));
      get().addAlert({ type: 'emergency', message: '🚨 AMBULANCE CRISIS SCENARIO: Emergency corridor activated — Gachibowli to HiTech City (4 signals)' });
    } else {
      set({ intersections: newIntersections, emergencyCorridors: [] });
    }
  },

  toggleLayer: (layer) => set(s => ({
    showHeatmap: layer === 'heatmap' ? !s.showHeatmap : s.showHeatmap,
    showConflictZones: layer === 'conflict' ? !s.showConflictZones : s.showConflictZones,
    showPredictions: layer === 'predictions' ? !s.showPredictions : s.showPredictions,
    showEmergencyLayer: layer === 'emergency' ? !s.showEmergencyLayer : s.showEmergencyLayer,
  })),

  tickSimulation: () => {
    const s = get();
    if (!s.isSimulationRunning) return;

    const speed = s.simulationSpeed;
    const updated = s.intersections.map(intersection => {
      // Countdown
      let countdown = intersection.countdown - speed;
      let signal = intersection.currentSignal;

      if (countdown <= 0) {
        if (signal === 'GREEN') { signal = 'YELLOW'; countdown = 4; }
        else if (signal === 'YELLOW') { signal = 'RED'; countdown = intersection.redDuration; }
        else { signal = 'GREEN'; countdown = intersection.greenDuration; }
      }

      // Drift density slightly
      const drift = (Math.random() - 0.48) * 2 * speed;
      const density = Math.max(0, Math.min(100, intersection.densityScore + drift));
      const stress = Math.max(0, Math.min(100, intersection.stressIndex + (Math.random() - 0.49) * 1.5 * speed));
      const spillover = Math.min(100, density * 0.85 + Math.random() * 10);
      const queueGrowth = Math.max(0, intersection.queueGrowthRate + (Math.random() - 0.5) * 0.3);
      const queueLength = Math.max(0, Math.round(intersection.queueLength + (signal === 'RED' ? queueGrowth * 0.2 : -queueGrowth * 0.1)));

      const updated = {
        ...intersection, countdown: Math.max(0, countdown), currentSignal: signal,
        densityScore: density, stressIndex: stress, spilloverRisk: spillover,
        queueGrowthRate: queueGrowth, queueLength,
        predictedCongestion: (density > 75 ? 'CRITICAL' : density > 55 ? 'HIGH' : density > 35 ? 'MODERATE' : 'LOW') as RiskLevel,
      };
      updated.greenDuration = computeGreenDuration(updated);
      updated.aiReasoning = generateAIReasoning(updated);
      return updated;
    });

    // Update metrics
    const avgDensity = updated.reduce((s, i) => s + i.densityScore, 0) / updated.length;
    const metrics = {
      ...s.systemMetrics,
      averageWaitTime: Math.round(20 + avgDensity * 0.5),
      throughputRate: Math.round(200 - avgDensity * 0.8),
      networkStress: Math.round(avgDensity),
      signalEfficiency: Math.round(100 - avgDensity * 0.3),
    };

    set({ intersections: updated, systemMetrics: metrics });
  },
}));
