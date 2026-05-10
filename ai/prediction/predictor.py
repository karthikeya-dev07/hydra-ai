"""
HYDRA AI — Predictive Congestion Engine
LSTM-inspired time-series forecasting for Indian traffic
Predicts congestion 2-15 minutes ahead using sliding window analysis
"""

import math
import time
import random
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class CongestionPrediction:
    intersection_id: str
    risk_level: str  # LOW, MODERATE, HIGH, CRITICAL
    predicted_density: float
    current_density: float
    minutes_ahead: int
    confidence: float
    slope_per_min: float
    reason: str
    timestamp: float = field(default_factory=time.time)

@dataclass
class CorridorPrediction:
    corridor_name: str
    overall_risk: str
    avg_predicted_density: float
    bottleneck_intersection: Optional[str]
    estimated_collapse_minutes: Optional[int]
    recommendations: list


class HydraPredictionEngine:
    """
    Predictive Congestion Engine using sliding-window trend analysis.
    Production-ready architecture for LSTM/Transformer model integration.
    
    Current implementation: statistical trend + weighted extrapolation
    Upgrade path: replace predict() with PyTorch LSTM inference
    """

    WINDOW_SIZE = 60     # data points in sliding window
    TREND_WINDOW = 15    # points for short-term trend
    RISK_THRESHOLDS = {"CRITICAL": 80, "HIGH": 60, "MODERATE": 40, "LOW": 0}

    def __init__(self):
        self.data_buffers: dict[str, deque] = {}
        self.corridor_map: dict[str, list] = {}

    def register_intersection(self, intersection_id: str, corridor: str = ""):
        if intersection_id not in self.data_buffers:
            self.data_buffers[intersection_id] = deque(maxlen=self.WINDOW_SIZE)
        if corridor:
            if corridor not in self.corridor_map:
                self.corridor_map[corridor] = []
            if intersection_id not in self.corridor_map[corridor]:
                self.corridor_map[corridor].append(intersection_id)

    def ingest(self, intersection_id: str, density: float, stress: float,
               queue_length: int, queue_growth: float, conflict: float,
               vehicle_counts: Optional[dict] = None):
        """Feed real-time data point into the prediction buffer."""
        self.register_intersection(intersection_id)
        self.data_buffers[intersection_id].append({
            "t": time.time(),
            "density": density,
            "stress": stress,
            "queue_length": queue_length,
            "queue_growth": queue_growth,
            "conflict": conflict,
            "counts": vehicle_counts or {},
        })

    def predict(self, intersection_id: str, minutes_ahead: int = 5) -> CongestionPrediction:
        """Predict congestion N minutes ahead for a single intersection."""
        buf = self.data_buffers.get(intersection_id)
        if not buf or len(buf) < 3:
            return CongestionPrediction(
                intersection_id=intersection_id, risk_level="UNKNOWN",
                predicted_density=0, current_density=0, minutes_ahead=minutes_ahead,
                confidence=0, slope_per_min=0, reason="Insufficient data"
            )

        recent = list(buf)
        densities = [p["density"] for p in recent]
        stresses = [p["stress"] for p in recent]
        queue_growths = [p["queue_growth"] for p in recent]

        current_density = densities[-1]
        current_stress = stresses[-1]

        # Short-term trend (linear regression)
        short = densities[-min(self.TREND_WINDOW, len(densities)):]
        slope = self._linear_slope(short)

        # Weighted prediction: combine density trend + queue growth + stress acceleration
        avg_queue_growth = sum(queue_growths[-5:]) / max(1, min(5, len(queue_growths)))
        stress_accel = self._linear_slope(stresses[-min(10, len(stresses)):])

        # Composite prediction
        density_pred = current_density + slope * minutes_ahead
        queue_contribution = avg_queue_growth * minutes_ahead * 1.5
        stress_contribution = stress_accel * minutes_ahead * 0.8

        predicted = density_pred + queue_contribution + stress_contribution
        predicted = max(0, min(100, predicted))

        # Confidence based on data stability and volume
        data_volume_factor = min(1.0, len(buf) / self.WINDOW_SIZE)
        volatility = self._volatility(short)
        confidence = max(30, min(95, 80 * data_volume_factor - volatility * 2))

        # Risk level
        risk = self._classify_risk(predicted)

        # Human-readable reason
        reason = self._generate_reason(
            current_density, predicted, slope, avg_queue_growth,
            stress_accel, minutes_ahead, risk
        )

        return CongestionPrediction(
            intersection_id=intersection_id,
            risk_level=risk,
            predicted_density=round(predicted, 1),
            current_density=round(current_density, 1),
            minutes_ahead=minutes_ahead,
            confidence=round(confidence, 1),
            slope_per_min=round(slope, 2),
            reason=reason,
        )

    def predict_corridor(self, corridor_name: str, minutes_ahead: int = 5) -> CorridorPrediction:
        """Predict congestion across an entire corridor."""
        ids = self.corridor_map.get(corridor_name, [])
        if not ids:
            return CorridorPrediction(
                corridor_name=corridor_name, overall_risk="UNKNOWN",
                avg_predicted_density=0, bottleneck_intersection=None,
                estimated_collapse_minutes=None, recommendations=[]
            )

        predictions = [self.predict(iid, minutes_ahead) for iid in ids]
        avg_pred = sum(p.predicted_density for p in predictions) / len(predictions)
        worst = max(predictions, key=lambda p: p.predicted_density)
        overall_risk = self._classify_risk(avg_pred)

        # Estimate time to collapse (density > 85)
        collapse_minutes = None
        if worst.slope_per_min > 0 and worst.predicted_density > 60:
            remaining = (85 - worst.current_density) / max(0.1, worst.slope_per_min)
            collapse_minutes = max(1, int(remaining))

        recommendations = []
        if overall_risk in ("HIGH", "CRITICAL"):
            recommendations.append(f"Extend green at {worst.intersection_id} by {int(worst.predicted_density * 0.4)}s")
            recommendations.append("Pre-clear upstream feeder signals")
        if worst.slope_per_min > 3:
            recommendations.append(f"Alert: {worst.intersection_id} density rising at {worst.slope_per_min:.1f}%/min")
        if any(p.risk_level == "CRITICAL" for p in predictions):
            recommendations.append("Activate corridor-level load balancing")

        return CorridorPrediction(
            corridor_name=corridor_name,
            overall_risk=overall_risk,
            avg_predicted_density=round(avg_pred, 1),
            bottleneck_intersection=worst.intersection_id,
            estimated_collapse_minutes=collapse_minutes,
            recommendations=recommendations,
        )

    def _linear_slope(self, values: list) -> float:
        n = len(values)
        if n < 2:
            return 0.0
        x = list(range(n))
        x_mean = sum(x) / n
        y_mean = sum(values) / n
        num = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, values))
        den = sum((xi - x_mean) ** 2 for xi in x)
        return num / (den + 1e-9)

    def _volatility(self, values: list) -> float:
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        return math.sqrt(sum((v - mean) ** 2 for v in values) / len(values))

    def _classify_risk(self, density: float) -> str:
        for level, threshold in self.RISK_THRESHOLDS.items():
            if density >= threshold:
                return level
        return "LOW"

    def _generate_reason(self, current, predicted, slope, queue_growth,
                         stress_accel, minutes, risk):
        delta = predicted - current
        direction = "rising" if delta > 2 else "falling" if delta < -2 else "stable"

        if risk == "CRITICAL":
            return (f"⚠️ Junction collapse predicted in {minutes}min. "
                    f"Density: {current:.0f}% → {predicted:.0f}% (+{delta:+.0f}%). "
                    f"Queue growth: {queue_growth:.1f} veh/min.")
        if risk == "HIGH":
            return (f"🔴 High congestion forming. Density {direction}: "
                    f"{current:.0f}% → {predicted:.0f}%. Rate: {slope:.1f}%/min.")
        if risk == "MODERATE":
            return (f"🟡 Moderate buildup expected. Density: "
                    f"{current:.0f}% → {predicted:.0f}%. Monitor queue growth.")
        return (f"✅ Traffic stable. Density: {current:.0f}% → {predicted:.0f}%. "
                f"No action required.")

    def get_all_predictions(self, minutes_ahead: int = 5) -> list:
        return [self.predict(iid, minutes_ahead) for iid in self.data_buffers.keys()]


# ── Singleton ─────────────────────────────────────────────────
prediction_engine = HydraPredictionEngine()

if __name__ == "__main__":
    engine = HydraPredictionEngine()
    engine.register_intersection("test-junction", "Test Corridor")

    # Simulate rising congestion
    for i in range(30):
        density = 30 + i * 1.5 + random.uniform(-3, 3)
        engine.ingest("test-junction", density=density, stress=density * 1.1,
                      queue_length=int(density * 0.4), queue_growth=1.5 + i * 0.1,
                      conflict=density * 0.5)

    pred = engine.predict("test-junction", minutes_ahead=5)
    print(f"\n=== HYDRA AI Congestion Prediction ===")
    print(f"Current Density:   {pred.current_density}%")
    print(f"Predicted (5min):  {pred.predicted_density}%")
    print(f"Risk Level:        {pred.risk_level}")
    print(f"Confidence:        {pred.confidence}%")
    print(f"Slope:             {pred.slope_per_min}%/min")
    print(f"Reason:            {pred.reason}")
