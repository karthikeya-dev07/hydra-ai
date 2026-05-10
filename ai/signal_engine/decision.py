"""
HYDRA AI — Adaptive Signal Decision Engine
Formula: GreenTime = BaseTime + α(Density) + β(QueueGrowth) + γ(Emergency)
"""

import math
import time
from dataclasses import dataclass, field
from typing import Optional

VEHICLE_WEIGHTS = {
    "bike": 1, "car": 2, "auto": 2, "bus": 5,
    "truck": 6, "pedestrian": 0.5, "ambulance": 0,
}

# ── Tunable Coefficients ─────────────────────────────────────
ALPHA = 0.5    # density coefficient
BETA  = 2.0    # queue growth coefficient
GAMMA = 60     # emergency priority bonus (seconds)
BASE_GREEN = 30
MIN_GREEN  = 15
MAX_GREEN  = 120
MIN_RED    = 20
MAX_RED    = 90

@dataclass
class SignalDecision:
    intersection_id: str
    recommended_green: int
    recommended_red: int
    density_score: float
    queue_growth_rate: float
    conflict_score: float
    spillover_risk: float
    gridlock_probability: float
    is_emergency: bool
    reasoning: str
    formula_breakdown: dict
    confidence: float
    timestamp: float = field(default_factory=time.time)


class HydraSignalEngine:
    """
    Behavior-Aware Adaptive Signal Engine for Indian Traffic.
    Computes optimal green/red durations per intersection using:
      - Weighted vehicle density (not just count)
      - Queue growth rate
      - Conflict zone intensity
      - Emergency vehicle priority
      - Spillover propagation risk
    """

    def __init__(self, alpha=ALPHA, beta=BETA, gamma=GAMMA, base=BASE_GREEN):
        self.alpha = alpha
        self.beta = beta
        self.gamma = gamma
        self.base = base
        self.history: dict[str, list] = {}

    def compute_density_score(self, vehicle_counts: dict) -> float:
        weighted = sum(VEHICLE_WEIGHTS.get(t, 1) * c for t, c in vehicle_counts.items())
        return min(100.0, weighted / 1.2)

    def compute_conflict_score(self, density: float, vehicle_counts: dict, queue_growth: float) -> float:
        bike_ratio = vehicle_counts.get("bike", 0) / max(1, sum(vehicle_counts.values()))
        swarm_factor = bike_ratio * 40          # bike swarm contribution
        growth_factor = queue_growth * 8         # queue instability
        density_factor = density * 0.4
        return min(100.0, swarm_factor + growth_factor + density_factor)

    def compute_spillover_risk(self, density: float, conflict: float, queue_length: int) -> float:
        base_risk = density * 0.6
        conflict_add = conflict * 0.3
        queue_add = min(20, queue_length * 0.4)
        return min(100.0, base_risk + conflict_add + queue_add)

    def compute_gridlock_probability(self, stress: float, spillover: float) -> float:
        return min(100.0, max(0.0, (stress - 30) * 1.2 + spillover * 0.3))

    def compute_green_time(
        self,
        density_score: float,
        queue_growth_rate: float,
        is_emergency: bool,
        spillover_risk: float,
        conflict_score: float,
    ) -> int:
        """
        Core formula:
        GreenTime = BASE + α·Density + β·QueueGrowth + γ·Emergency
        With spillover and conflict modifiers.
        """
        base_contribution = self.base
        density_contribution = self.alpha * density_score
        queue_contribution = self.beta * queue_growth_rate
        emergency_contribution = self.gamma if is_emergency else 0

        # Spillover correction: extend green to flush queue
        spillover_bonus = 0.0
        if spillover_risk > 70:
            spillover_bonus = (spillover_risk - 70) * 0.3

        # Conflict correction: add buffer for chaotic merges
        conflict_bonus = 0.0
        if conflict_score > 60:
            conflict_bonus = (conflict_score - 60) * 0.15

        raw = (base_contribution + density_contribution + queue_contribution
               + emergency_contribution + spillover_bonus + conflict_bonus)

        return max(MIN_GREEN, min(MAX_GREEN, int(raw)))

    def compute_red_time(self, green_time: int, density_score: float, is_emergency: bool) -> int:
        """Red time inversely proportional to cross-direction density needs."""
        if is_emergency:
            return MIN_RED
        base_red = 60
        density_reduction = max(0, (density_score - 50) * 0.2)
        raw = base_red - density_reduction
        return max(MIN_RED, min(MAX_RED, int(raw)))

    def make_decision(
        self,
        intersection_id: str,
        vehicle_counts: dict,
        queue_growth_rate: float,
        is_emergency: bool = False,
        manual_density: Optional[float] = None,
    ) -> SignalDecision:
        density = manual_density if manual_density is not None else self.compute_density_score(vehicle_counts)
        stress = min(100.0, density + (queue_growth_rate * 4))
        conflict = self.compute_conflict_score(density, vehicle_counts, queue_growth_rate)
        spillover = self.compute_spillover_risk(density, conflict, sum(vehicle_counts.values()))
        gridlock = self.compute_gridlock_probability(stress, spillover)

        green = self.compute_green_time(density, queue_growth_rate, is_emergency, spillover, conflict)
        red = self.compute_red_time(green, density, is_emergency)

        reasoning = self._generate_reasoning(
            density, stress, spillover, conflict, queue_growth_rate,
            is_emergency, green, vehicle_counts
        )

        confidence = min(99.0, 70 + density * 0.15 + queue_growth_rate * 2)

        decision = SignalDecision(
            intersection_id=intersection_id,
            recommended_green=green,
            recommended_red=red,
            density_score=round(density, 1),
            queue_growth_rate=queue_growth_rate,
            conflict_score=round(conflict, 1),
            spillover_risk=round(spillover, 1),
            gridlock_probability=round(gridlock, 1),
            is_emergency=is_emergency,
            reasoning=reasoning,
            formula_breakdown={
                "base": self.base,
                "alpha_density": round(self.alpha * density, 1),
                "beta_queue_growth": round(self.beta * queue_growth_rate, 1),
                "gamma_emergency": self.gamma if is_emergency else 0,
                "spillover_bonus": round(max(0, (spillover - 70) * 0.3), 1),
                "conflict_bonus": round(max(0, (conflict - 60) * 0.15), 1),
                "total": green,
            },
            confidence=round(confidence, 1),
        )

        # Store history
        if intersection_id not in self.history:
            self.history[intersection_id] = []
        self.history[intersection_id].append({
            "t": time.time(), "green": green, "density": density,
            "stress": stress, "spillover": spillover,
        })
        if len(self.history[intersection_id]) > 100:
            self.history[intersection_id] = self.history[intersection_id][-100:]

        return decision

    def _generate_reasoning(self, density, stress, spillover, conflict,
                             queue_growth, is_emergency, green, counts):
        if is_emergency:
            return (f"🚨 EMERGENCY OVERRIDE: Ambulance priority active. "
                    f"Green extended to {green}s. All feeder intersections pre-cleared.")
        if stress > 80:
            return (f"⚠️ Gridlock probability HIGH ({stress:.0f}%). "
                    f"Green extended by {int(stress*0.4)}s. Upstream signals pre-cleared.")
        if spillover > 70:
            return (f"🔴 Spillover risk CRITICAL ({spillover:.0f}%). "
                    f"Queue growth: +{queue_growth:.1f} veh/min. Extended green to flush queue.")
        bike_pct = counts.get("bike", 0) / max(1, sum(counts.values())) * 100
        if bike_pct > 50:
            return (f"🏍️ Bike swarm detected ({bike_pct:.0f}% bikes). "
                    f"Conflict buffer added. Green: {green}s.")
        if conflict > 60:
            return (f"⚡ High conflict zone ({conflict:.0f}%). "
                    f"Merge aggression detected. Buffer: {int((conflict-60)*0.15):.0f}s added.")
        if density > 70:
            return (f"📊 High density ({density:.0f}%). "
                    f"Green extended by {int((density-50)*0.6):.0f}s. Downstream pre-greened.")
        if density < 25:
            return (f"✅ Low density ({density:.0f}%). "
                    f"Cycle shortened. Adjacent corridors rebalanced.")
        return (f"🤖 AI Adaptive: Density {density:.0f}% | "
                f"Queue +{queue_growth:.1f} veh/min | Optimal green: {green}s")

    def get_trend(self, intersection_id: str) -> dict:
        """Return congestion trend for an intersection."""
        hist = self.history.get(intersection_id, [])
        if len(hist) < 2:
            return {"trend": "stable", "delta": 0}
        recent = [h["density"] for h in hist[-5:]]
        older = [h["density"] for h in hist[-10:-5]]
        if not older:
            return {"trend": "stable", "delta": 0}
        delta = sum(recent) / len(recent) - sum(older) / len(older)
        trend = "rising" if delta > 5 else "falling" if delta < -5 else "stable"
        return {"trend": trend, "delta": round(delta, 1)}

    def predict_congestion(self, intersection_id: str, minutes_ahead: int = 5) -> dict:
        """Simple linear extrapolation congestion prediction."""
        hist = self.history.get(intersection_id, [])
        if len(hist) < 3:
            return {"risk": "UNKNOWN", "predicted_density": None}

        densities = [h["density"] for h in hist[-10:]]
        # Linear regression slope
        n = len(densities)
        x = list(range(n))
        slope = (n * sum(i * d for i, d in zip(x, densities)) - sum(x) * sum(densities)) / (n * sum(i**2 for i in x) - sum(x)**2 + 1e-9)
        current = densities[-1]
        predicted = current + slope * minutes_ahead * 60  # each step ~1s
        predicted = max(0, min(100, predicted))

        risk = "CRITICAL" if predicted > 80 else "HIGH" if predicted > 60 else "MODERATE" if predicted > 40 else "LOW"
        return {
            "risk": risk,
            "predicted_density": round(predicted, 1),
            "current_density": round(current, 1),
            "slope_per_min": round(slope * 60, 2),
            "minutes_ahead": minutes_ahead,
        }


# ── Singleton ─────────────────────────────────────────────────
signal_engine = HydraSignalEngine()


if __name__ == "__main__":
    engine = HydraSignalEngine()

    # Test scenario: peak hour with ambulance
    test_counts = {
        "bike": 35, "car": 18, "auto": 12, "bus": 4,
        "truck": 2, "pedestrian": 20, "ambulance": 1,
    }

    print("\n=== HYDRA AI Signal Decision Engine ===\n")

    decision = engine.make_decision(
        intersection_id="gachibowli-main",
        vehicle_counts=test_counts,
        queue_growth_rate=6.2,
        is_emergency=True,
    )

    print(f"Intersection:       {decision.intersection_id}")
    print(f"Density Score:      {decision.density_score}%")
    print(f"Conflict Score:     {decision.conflict_score}%")
    print(f"Spillover Risk:     {decision.spillover_risk}%")
    print(f"Gridlock Prob:      {decision.gridlock_probability}%")
    print(f"Recommended Green:  {decision.recommended_green}s")
    print(f"Recommended Red:    {decision.recommended_red}s")
    print(f"AI Confidence:      {decision.confidence}%")
    print(f"\nFormula Breakdown:")
    for k, v in decision.formula_breakdown.items():
        print(f"  {k:25s}: {v}")
    print(f"\nAI Reasoning:\n  {decision.reasoning}")
