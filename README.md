# 🐍 HYDRA AI

### Behavior-Aware Adaptive Traffic Intelligence for Hyderabad

> *"An AI-powered operating system for Indian urban mobility"*

---

## 🌟 Overview

HYDRA AI is an AI-driven adaptive traffic intelligence platform designed specifically for **Indian mixed-traffic conditions**. Unlike conventional systems that assume lane discipline and structured movement, HYDRA AI understands:

- **Chaotic traffic behavior** — unstructured movement, opportunistic driving
- **Mixed vehicle dynamics** — bikes, autos, buses, trucks, pedestrians
- **Intersection conflicts** — stop-line violations, merge aggression, blocked free-lefts
- **Bike swarm intelligence** — fluid-like two-wheeler cluster behavior
- **Emergency vehicle priority** — predictive green corridor generation
- **Dynamic road conditions** — construction, accidents, metro diversions

Inspired by Singapore's **GLIDE** adaptive coordination model, redesigned for the unpredictability of Indian urban traffic.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   HYDRA AI Platform                  │
├─────────────┬──────────────┬──────────────┬─────────┤
│  Input      │  AI Engine   │  Decision    │  Output │
│  Layer      │  Layer       │  Layer       │  Layer  │
├─────────────┼──────────────┼──────────────┼─────────┤
│ CCTV feeds  │ YOLOv11      │ Signal       │ Digital │
│ GPS data    │ DeepSORT     │ Optimizer    │ Twin    │
│ IoT sensors │ LSTM/GNN     │ Emergency    │ Dashboard│
│ Weather API │ Conflict     │ Router       │ Analytics│
│ Event data  │ Analyzer     │ Corridor     │ Alerts  │
│             │              │ Balancer     │         │
└─────────────┴──────────────┴──────────────┴─────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- Git

### Frontend (Next.js Dashboard)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the full HYDRA AI command center.

### Backend (FastAPI)

```bash
# Create virtual environment
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run API server
python main.py
```

API at [http://localhost:8000](http://localhost:8000) — Docs at `/docs`.

### Docker (Full Stack)

```bash
docker-compose up --build
```

---

## 🧠 AI Pipeline

### Detection Engine (`ai/detection/detector.py`)

- **YOLOv11** real-time vehicle detection
- **DeepSORT** multi-object tracking
- Indian traffic class mapping: bike, car, auto, bus, truck, pedestrian, ambulance
- Weighted density scoring (bike=1, car=2, auto=2, bus=5, truck=6)
- Conflict zone detection via bbox overlap analysis
- Stop-line violation detection

### Signal Decision Engine (`ai/signal_engine/decision.py`)

Adaptive green-time formula:

```
GreenTime = BASE(30s) + α·Density + β·QueueGrowth + γ·Emergency
           + spillover_bonus + conflict_bonus
```

Where:
- α = 0.5 (density coefficient)
- β = 2.0 (queue growth coefficient)  
- γ = 60s (emergency priority bonus)

### Prediction Engine (`ai/prediction/predictor.py`)

- Sliding-window trend analysis
- Linear regression + composite prediction
- Junction-level and corridor-level forecasting
- 2-15 minute ahead congestion prediction
- LSTM/Transformer upgrade path ready

### Training Pipeline (`ai/training/train.py`)

```bash
# Set up dataset structure
python ai/training/train.py --setup

# Train on Indian traffic data
python ai/training/train.py --train --epochs 100 --model yolo11n.pt

# Evaluate
python ai/training/train.py --eval

# Export for deployment
python ai/training/train.py --export --format onnx
```

---

## 🖥️ Dashboard Features

| Feature | Description |
|---------|-------------|
| **City Digital Twin** | Canvas-based animated map with all 12 Hyderabad intersections |
| **Signal Visualization** | Cinematic animated traffic signals with glow + countdown |
| **AI Detection Feed** | Simulated CCTV with live bounding boxes and confidence scores |
| **Intersection Panel** | Density rings, stress bars, AI reasoning, vehicle counts |
| **Prediction Panel** | Network-wide density forecast with trend charts |
| **Alert System** | Real-time AI alerts with severity classification |
| **Scenario Switcher** | Normal / Peak Hour / Accident / Ambulance Crisis modes |
| **Emergency Corridor** | One-click emergency green wave across 4 intersections |
| **System Metrics** | Wait time, throughput, efficiency, fuel/CO₂ savings |

---

## 🗺️ Monitored Intersections (MVP)

| ID | Junction | Corridor |
|----|----------|----------|
| gachibowli-main | Gachibowli Junction | Gachibowli |
| hitech-flyover | HiTech City Flyover | HiTech |
| kondapur-x | Kondapur X Roads | HiTech |
| madhapur-main | Madhapur Main | HiTech |
| jubilee-hills | Jubilee Hills Check Post | Jubilee |
| banjara-hills | Banjara Hills Rd 12 | Jubilee |
| panjagutta | Panjagutta Circle | Jubilee |
| ameerpet | Ameerpet Metro | Metro |
| sr-nagar | SR Nagar Junction | Metro |
| begumpet | Begumpet Signal | Airport |
| secunderabad-main | Secunderabad Clock Tower | Airport |
| lb-nagar | LB Nagar Junction | ORR East |

---

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intersections` | All intersection states |
| GET | `/api/intersections/{id}` | Single intersection detail |
| POST | `/api/scenario/{name}` | Switch scenario |
| POST | `/api/emergency/trigger` | Activate emergency corridor |
| POST | `/api/emergency/clear` | Clear emergency |
| GET | `/api/metrics/system` | System-wide KPIs |
| GET | `/api/predictions` | Congestion predictions |
| WS | `/ws/traffic` | Real-time WebSocket stream |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | Next.js 14, TailwindCSS, Framer Motion, Recharts, Canvas API |
| Backend | FastAPI, Python 3.11, WebSockets, Uvicorn |
| AI/ML | YOLOv11, DeepSORT, PyTorch, OpenCV, Ultralytics |
| State | Zustand (frontend), In-memory + Redis (backend) |
| Infra | Docker, Docker Compose |

---

## 📁 Project Structure

```
hydra-ai/
├── app/                    # Next.js pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard
│   └── globals.css         # Design system
├── components/             # React components
│   ├── TrafficMap.tsx       # Canvas city map
│   ├── TrafficSignal.tsx    # Animated signals
│   ├── IntersectionPanel.tsx # Detail panel
│   ├── CameraFeed.tsx       # CCTV simulation
│   ├── ControlPanel.tsx     # Layer/scenario controls
│   ├── MetricDisplays.tsx   # Rings, bars, badges
│   ├── PredictionPanel.tsx  # AI forecasts
│   ├── AlertsPanel.tsx      # Alert notifications
│   └── SystemMetrics.tsx    # KPI status bar
├── lib/
│   └── store.ts            # Zustand state + simulation engine
├── backend/
│   ├── main.py             # FastAPI server
│   └── requirements.txt    # Python dependencies
├── ai/
│   ├── detection/
│   │   └── detector.py     # YOLOv11 + DeepSORT engine
│   ├── signal_engine/
│   │   └── decision.py     # Adaptive signal optimizer
│   ├── prediction/
│   │   └── predictor.py    # Congestion forecaster
│   └── training/
│       └── train.py        # YOLO fine-tuning pipeline
├── docker-compose.yml
├── Dockerfile
├── Dockerfile.backend
├── package.json
├── tailwind.config.js
└── README.md
```

---

## 🎯 KPI Targets

| KPI | Target |
|-----|--------|
| Average wait time reduction | 20-30% |
| Emergency response improvement | 40% |
| Junction spillover reduction | 25% |
| Signal efficiency improvement | 30% |
| Fuel waste reduction | 15% |

---

## 📜 License

MIT License — Built for Hyderabad, scalable to any Indian city.
