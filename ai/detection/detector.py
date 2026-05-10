"""
HYDRA AI — Vehicle Detection Engine
YOLOv11 + DeepSORT for Indian mixed-traffic detection
"""

import cv2
import numpy as np
import time
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

try:
    from deep_sort_realtime.deepsort_tracker import DeepSort
    DEEPSORT_AVAILABLE = True
except ImportError:
    DEEPSORT_AVAILABLE = False

# ── Config ───────────────────────────────────────────────────
VEHICLE_WEIGHTS = {
    "bike": 1, "motorcycle": 1, "bicycle": 1,
    "car": 2, "auto": 2, "auto-rickshaw": 2,
    "bus": 5, "truck": 6, "pedestrian": 0.5, "ambulance": 0
}

YOLO_CLASS_MAP = {
    0: "pedestrian", 1: "bicycle", 2: "car", 3: "motorcycle",
    5: "bus", 7: "truck",
}

# Indian traffic custom labels (if custom model trained)
HYDRA_CLASS_MAP = {
    0: "bike", 1: "car", 2: "auto", 3: "bus",
    4: "truck", 5: "pedestrian", 6: "ambulance",
}

# UVH-26 (IISc AIM) Indian Traffic class map
UVH26_CLASS_MAP = {
    0: "bike",           # two-wheeler
    1: "auto",           # three-wheeler
    2: "bike",           # bicycle
    3: "car",            # hatchback
    4: "car",            # sedan
    5: "car",            # suv
    6: "car",            # muv
    7: "truck",          # lcv
    8: "bus",            # mini-bus
    9: "bus",            # bus
    10: "truck",         # truck
    11: "bus",           # tempo-traveller
    12: "car",           # van
    13: "car",           # others
}

VEHICLE_COLORS = {
    "bike": (0, 245, 255), "auto": (255, 204, 0), "car": (0, 255, 136),
    "bus": (255, 107, 53), "truck": (255, 45, 85), "pedestrian": (139, 92, 246),
    "ambulance": (255, 0, 0), "default": (100, 180, 255),
}

@dataclass
class DetectionResult:
    vehicle_type: str
    confidence: float
    bbox: tuple  # x1, y1, x2, y2
    track_id: Optional[int] = None
    
@dataclass
class FrameAnalysis:
    detections: list = field(default_factory=list)
    vehicle_counts: dict = field(default_factory=dict)
    weighted_density: float = 0.0
    density_score: float = 0.0
    queue_length: int = 0
    stop_line_violations: int = 0
    conflict_score: float = 0.0
    fps: float = 0.0
    inference_time_ms: float = 0.0
    timestamp: float = field(default_factory=time.time)

class HydraDetector:
    """
    HYDRA AI Vehicle Detection Engine
    Supports YOLOv8/v11 + DeepSORT tracking
    Falls back to simulation mode if models unavailable
    """

    def __init__(self, model_path: str = "uvh26_indian_traffic.pt", use_deepsort: bool = False, device: str = "auto", collect_data: bool = True):
        self.model = None
        self.tracker = None
        self.model_path = model_path
        self.collect_data = collect_data
        self.frame_count = 0
        self.fps_history = []
        self.data_dir = Path("datasets/collected")
        if self.collect_data:
            self.data_dir.mkdir(parents=True, exist_ok=True)

        # Device selection
        if device == "auto":
            try:
                import torch
                self.device = "cuda" if torch.cuda.is_available() else "cpu"
            except ImportError:
                self.device = "cpu"
        else:
            self.device = device

        # Load YOLO
        if YOLO_AVAILABLE:
            try:
                self.model = YOLO(model_path)
                self.model.to(self.device)
                print(f"[HYDRA] YOLOv11 loaded: {model_path} on {self.device}")
                
                # Check if custom Hydra classes
                if hasattr(self.model, 'names') and 'auto' in self.model.names.values():
                    self.use_custom_classes = True
                    print("[HYDRA] Custom Indian traffic model detected")
            except Exception as e:
                print(f"[HYDRA] YOLO load failed: {e} — using simulation mode")
        else:
            print("[HYDRA] ultralytics not installed — using simulation mode")

        # Load DeepSORT
        if use_deepsort and DEEPSORT_AVAILABLE:
            try:
                self.tracker = DeepSort(max_age=30, n_init=3)
                print("[HYDRA] DeepSORT tracker initialized")
            except Exception as e:
                print(f"[HYDRA] DeepSORT init failed: {e}")

    def detect_frame(self, frame: np.ndarray, stop_line_y: Optional[float] = None) -> FrameAnalysis:
        """Run full detection pipeline on a single frame."""
        t0 = time.time()
        h, w = frame.shape[:2]
        analysis = FrameAnalysis()

        if self.model is None:
            # Simulation fallback
            return self._simulate_detection(w, h)

        try:
            results = self.model(frame, verbose=False, conf=0.4, iou=0.5)
            detections = []

            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                    # Map class using specialized UVH-26 map
                    vtype = UVH26_CLASS_MAP.get(cls_id, "car")
                    
                    # Data Collection: Save frame if confidence is low (< 0.5)
                    if self.collect_data and conf < 0.5 and self.frame_count % 30 == 0:
                        self._save_collected_frame(frame, vtype, conf)

                    det = DetectionResult(vehicle_type=vtype, confidence=conf, bbox=(x1, y1, x2, y2))
                    detections.append(det)

                    # Stop line violation check
                    if stop_line_y and y2 > stop_line_y * h:
                        analysis.stop_line_violations += 1

            # DeepSORT tracking
            if self.tracker:
                raw_dets = [([d.bbox[0], d.bbox[1], d.bbox[2] - d.bbox[0], d.bbox[3] - d.bbox[1]], d.confidence, d.vehicle_type) for d in detections]
                tracks = self.tracker.update_tracks(raw_dets, frame=frame)
                for i, track in enumerate(tracks):
                    if track.is_confirmed() and i < len(detections):
                        detections[i].track_id = track.track_id

            analysis.detections = detections
            analysis.vehicle_counts = self._count_vehicles(detections)
            analysis.weighted_density = self._compute_weighted_density(analysis.vehicle_counts)
            analysis.density_score = min(100.0, analysis.weighted_density / 1.2)
            analysis.queue_length = len(detections)
            analysis.conflict_score = self._compute_conflict_score(detections, w, h)

        except Exception as e:
            print(f"[HYDRA] Detection error: {e}")
            return self._simulate_detection(w, h)

        analysis.inference_time_ms = (time.time() - t0) * 1000
        self._update_fps(analysis.inference_time_ms)
        analysis.fps = self.get_fps()
        return analysis

    def annotate_frame(self, frame: np.ndarray, analysis: FrameAnalysis,
                       stop_line_y: float = 0.55) -> np.ndarray:
        """Draw bounding boxes, labels, HUD overlays onto frame."""
        h, w = frame.shape[:2]
        annotated = frame.copy()
        
        # Stop line
        sl_y = int(stop_line_y * h)
        cv2.line(annotated, (0, sl_y), (w, sl_y), (255, 255, 255, 80), 1)

        for det in analysis.detections:
            x1, y1, x2, y2 = det.bbox
            color = VEHICLE_COLORS.get(det.vehicle_type, VEHICLE_COLORS["default"])
            
            # Bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            
            # Corner brackets
            cs = 8
            cv2.line(annotated, (x1, y1), (x1 + cs, y1), color, 2)
            cv2.line(annotated, (x1, y1), (x1, y1 + cs), color, 2)
            cv2.line(annotated, (x2, y1), (x2 - cs, y1), color, 2)
            cv2.line(annotated, (x2, y1), (x2, y1 + cs), color, 2)
            cv2.line(annotated, (x1, y2), (x1 + cs, y2), color, 2)
            cv2.line(annotated, (x1, y2), (x1, y2 - cs), color, 2)
            cv2.line(annotated, (x2, y2), (x2 - cs, y2), color, 2)
            cv2.line(annotated, (x2, y2), (x2, y2 - cs), color, 2)
            
            # Label
            label = f"{det.vehicle_type} {det.confidence:.0%}"
            if det.track_id:
                label = f"#{det.track_id} {label}"
            cv2.rectangle(annotated, (x1, y1 - 16), (x1 + len(label) * 6, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 0, 0), 1)

        # HUD overlay
        self._draw_hud(annotated, analysis, w, h)
        return annotated

    def _draw_hud(self, frame, analysis: FrameAnalysis, w, h):
        # Top bar
        cv2.rectangle(frame, (0, 0), (w, 24), (2, 8, 22), -1)
        rec_text = f"● REC  HYDRA AI  {analysis.fps:.0f}fps  {analysis.inference_time_ms:.0f}ms"
        cv2.putText(frame, rec_text, (6, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 245, 255), 1)
        cv2.putText(frame, "YOLOv11 | DeepSORT", (w - 120, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (0, 245, 255), 1)

        # Bottom bar
        cv2.rectangle(frame, (0, h - 20), (w, h), (2, 8, 22), -1)
        status = f"Objects: {len(analysis.detections)}  |  Density: {analysis.density_score:.0f}%  |  Violations: {analysis.stop_line_violations}"
        cv2.putText(frame, status, (6, h - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (107, 141, 176), 1)

        # Density indicator
        bar_x, bar_y, bar_w, bar_h = w - 80, 30, 70, 8
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h), (13, 33, 55), -1)
        fill = int(bar_w * analysis.density_score / 100)
        color = (255, 45, 85) if analysis.density_score > 75 else (255, 204, 0) if analysis.density_score > 50 else (0, 255, 136)
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill, bar_y + bar_h), color, -1)
        cv2.putText(frame, f"DENSITY {analysis.density_score:.0f}%", (bar_x, bar_y + bar_h + 12),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.28, color, 1)

    def _count_vehicles(self, detections: list) -> dict:
        counts = {k: 0 for k in ["bike", "car", "auto", "bus", "truck", "pedestrian", "ambulance"]}
        for det in detections:
            vt = det.vehicle_type
            if vt == "motorcycle": vt = "bike"
            if vt in counts:
                counts[vt] += 1
        return counts

    def _compute_weighted_density(self, counts: dict) -> float:
        return sum(VEHICLE_WEIGHTS.get(t, 1) * c for t, c in counts.items())

    def _compute_conflict_score(self, detections: list, w: int, h: int) -> float:
        if len(detections) < 2:
            return 0.0
        # Count overlapping bounding boxes as conflict indicator
        overlaps = 0
        dets = [d.bbox for d in detections]
        for i in range(len(dets)):
            for j in range(i + 1, len(dets)):
                ax1, ay1, ax2, ay2 = dets[i]
                bx1, by1, bx2, by2 = dets[j]
                inter_x = max(0, min(ax2, bx2) - max(ax1, bx1))
                inter_y = max(0, min(ay2, by2) - max(ay1, by1))
                if inter_x > 0 and inter_y > 0:
                    overlaps += 1
        return min(100.0, overlaps * 10.0)

    def _simulate_detection(self, w: int, h: int) -> FrameAnalysis:
        """Generate realistic simulated detection results for demo/testing."""
        analysis = FrameAnalysis()
        counts = {
            "bike": np.random.randint(8, 25), "car": np.random.randint(4, 15),
            "auto": np.random.randint(3, 10), "bus": np.random.randint(1, 4),
            "truck": np.random.randint(0, 3), "pedestrian": np.random.randint(2, 12),
            "ambulance": 0,
        }
        detections = []
        for vtype, count in counts.items():
            for _ in range(min(count, 4)):
                bw = int(w * (0.15 if vtype in ("bus", "truck") else 0.08))
                bh = int(h * (0.12 if vtype in ("bus", "truck") else 0.07))
                x1 = np.random.randint(0, max(1, w - bw))
                y1 = np.random.randint(int(h * 0.3), max(int(h * 0.3) + 1, h - bh))
                detections.append(DetectionResult(
                    vehicle_type=vtype,
                    confidence=0.75 + np.random.random() * 0.24,
                    bbox=(x1, y1, x1 + bw, y1 + bh),
                    track_id=np.random.randint(1, 200),
                ))
        analysis.detections = detections
        analysis.vehicle_counts = counts
        analysis.weighted_density = self._compute_weighted_density(counts)
        analysis.density_score = min(100.0, analysis.weighted_density / 1.2)
        analysis.queue_length = sum(counts.values())
        analysis.fps = 24.0
        analysis.inference_time_ms = 42.0
        return analysis

    def _update_fps(self, ms: float):
        self.fps_history.append(1000 / ms if ms > 0 else 0)
        if len(self.fps_history) > 30:
            self.fps_history.pop(0)

    def get_fps(self) -> float:
        return sum(self.fps_history) / len(self.fps_history) if self.fps_history else 0

    def _save_collected_frame(self, frame, vtype, conf):
        """Save a frame for future training when AI is unsure."""
        timestamp = int(time.time() * 1000)
        filename = self.data_dir / f"low_conf_{vtype}_{conf:.2f}_{timestamp}.jpg"
        cv2.imwrite(str(filename), frame)
        print(f"[HYDRA DATA] Collected low-confidence frame: {filename}")

    def process_video(self, video_path: str, output_path: Optional[str] = None, show: bool = False):
        """Process a video file and save annotated output."""
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"[HYDRA] Cannot open video: {video_path}")
            return

        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_num = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_num += 1
            analysis = self.detect_frame(frame)
            annotated = self.annotate_frame(frame, analysis)
            if writer:
                writer.write(annotated)
            if show:
                cv2.imshow("HYDRA AI Detection", annotated)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
            if frame_num % 30 == 0:
                print(f"[HYDRA] Frame {frame_num} | Density: {analysis.density_score:.0f}% | Objects: {len(analysis.detections)} | FPS: {analysis.fps:.1f}")

        cap.release()
        if writer:
            writer.release()
        if show:
            cv2.destroyAllWindows()
        print(f"[HYDRA] Processing complete — {frame_num} frames")

if __name__ == "__main__":
    import sys
    video = sys.argv[1] if len(sys.argv) > 1 else "test_traffic.mp4"
    detector = HydraDetector(model_path="yolo11n.pt", use_deepsort=True)
    detector.process_video(video, output_path="hydra_output.mp4", show=True)
