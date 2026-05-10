"""
HYDRA AI — FastAPI Backend
Real-time traffic intelligence API with WebSocket support
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import json
import random
import math
import time
from datetime import datetime
from typing import Optional
import uvicorn
import cv2
import numpy as np
from pathlib import Path
from ai.detection.detector import HydraDetector

# Initialize the specialized IISc-AIM detector
detector = HydraDetector(model_path="ai/detection/uvh26_indian_traffic.pt", collect_data=True)

app = FastAPI(
    title="HYDRA AI Traffic Intelligence API",
    description="Behavior-Aware Adaptive Traffic Intelligence for Hyderabad",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory state ──────────────────────────────────────────
INTERSECTIONS = [
    {"id": "gachibowli-main",   "name": "Gachibowli Junction",       "lat": 17.4401, "lng": 78.3489, "corridor": "Gachibowli"},
    {"id": "hitech-flyover",    "name": "HiTech City Flyover",        "lat": 17.4486, "lng": 78.3762, "corridor": "HiTech"},
    {"id": "kondapur-x",        "name": "Kondapur X Roads",           "lat": 17.4590, "lng": 78.3619, "corridor": "HiTech"},
    {"id": "madhapur-main",     "name": "Madhapur Main",              "lat": 17.4492, "lng": 78.3942, "corridor": "HiTech"},
    {"id": "jubilee-hills",     "name": "Jubilee Hills Check Post",   "lat": 17.4312, "lng": 78.4050, "corridor": "Jubilee"},
    {"id": "banjara-hills",     "name": "Banjara Hills Rd 12",        "lat": 17.4157, "lng": 78.4483, "corridor": "Jubilee"},
    {"id": "panjagutta",        "name": "Panjagutta Circle",          "lat": 17.4239, "lng": 78.4481, "corridor": "Jubilee"},
    {"id": "ameerpet",          "name": "Ameerpet Metro",             "lat": 17.4374, "lng": 78.4482, "corridor": "Metro"},
    {"id": "sr-nagar",          "name": "SR Nagar Junction",          "lat": 17.4528, "lng": 78.4427, "corridor": "Metro"},
    {"id": "begumpet",          "name": "Begumpet Signal",            "lat": 17.4432, "lng": 78.4687, "corridor": "Airport"},
    {"id": "secunderabad-main", "name": "Secunderabad Clock Tower",   "lat": 17.4399, "lng": 78.4983, "corridor": "Airport"},
    {"id": "lb-nagar",          "name": "LB Nagar Junction",          "lat": 17.3476, "lng": 78.5479, "corridor": "ORR East"},
]

VEHICLE_WEIGHTS = {"bike": 1, "car": 2, "auto": 2, "bus": 5, "truck": 6, "pedestrian": 0.5, "ambulance": 0}

traffic_state = {}
active_websockets = []
emergency_corridors = []

def init_intersection_state(intersection_id: str, scenario: str = "normal") -> dict:
    multiplier = {"normal": 1.0, "peak-hour": 1.8, "accident": 1.4, "ambulance-crisis": 2.0}.get(scenario, 1.0)
    is_peak = scenario in ("peak-hour", "ambulance-crisis")
    
    counts = {
        "bike": int((25 if is_peak else 12) * multiplier + random.random() * 10),
        "car": int((18 if is_peak else 8) * multiplier + random.random() * 6),
        "auto": int((12 if is_peak else 5) * multiplier + random.random() * 5),
        "bus": int((4 if is_peak else 2) * multiplier + random.random() * 2),
        "truck": int(2 * multiplier + random.random() * 2),
        "pedestrian": int((20 if is_peak else 8) * multiplier + random.random() * 8),
        "ambulance": 0,
    }
    
    weighted = sum(VEHICLE_WEIGHTS.get(t, 1) * c for t, c in counts.items())
    density = min(100.0, weighted / 1.2)
    stress = min(100.0, density + random.random() * 20)
    spillover = min(100.0, stress * 0.9 + random.random() * 15)
    
    base_green = 30
    queue_growth = round(random.random() * 5, 1)
    green_duration = int(base_green + 0.5 * density + 2.0 * queue_growth)
    green_duration = max(15, min(120, green_duration))
    
    signal = random.choice(["RED", "RED", "GREEN", "RED", "GREEN"])
    
    return {
        "id": intersection_id,
        "currentSignal": signal,
        "countdown": random.randint(5, 60),
        "greenDuration": green_duration,
        "redDuration": 60,
        "densityScore": round(density, 1),
        "stressIndex": round(stress, 1),
        "spilloverRisk": round(spillover, 1),
        "gridlockProbability": round(max(0, stress - 30) * 1.5, 1),
        "conflictScore": round(random.random() * 60 + 10, 1),
        "queueLength": int(sum(counts.values()) * 0.6),
        "queueGrowthRate": queue_growth,
        "vehicleCounts": counts,
        "isEmergency": False,
        "predictedCongestion": "HIGH" if density > 75 else "MODERATE" if density > 50 else "LOW",
        "aiReasoning": compute_ai_reasoning(density, stress, spillover, queue_growth, False),
        "lastUpdated": time.time(),
    }

def compute_ai_reasoning(density, stress, spillover, queue_growth, is_emergency):
    if is_emergency:
        return "🚨 EMERGENCY OVERRIDE: Ambulance detected. Green corridor activated."
    if stress > 80:
        return f"⚠️ Gridlock probability HIGH ({stress:.0f}%). Extended green by {int(stress*0.4)}s."
    if spillover > 70:
        return f"🔴 Spillover risk CRITICAL. Queue growth: +{queue_growth:.1f} veh/min."
    if density > 75:
        return f"📊 High density ({density:.0f}%). Extended green by {int((density-50)*0.6)}s."
    if density < 30:
        return f"✅ Low density ({density:.0f}%). Cycle shortened. Corridor balanced."
    return f"🤖 AI Adaptive: Density {density:.0f}% | Queue growth {queue_growth:.1f} veh/min"

# Initialize state
for inter in INTERSECTIONS:
    traffic_state[inter["id"]] = init_intersection_state(inter["id"])

# ── Simulation tick ──────────────────────────────────────────
async def simulation_tick():
    while True:
        await asyncio.sleep(1)
        for inter_id, state in traffic_state.items():
            # Countdown
            countdown = state["countdown"] - 1
            signal = state["currentSignal"]
            if countdown <= 0:
                if signal == "GREEN":   signal, countdown = "YELLOW", 4
                elif signal == "YELLOW": signal, countdown = "RED", state["redDuration"]
                else:                   signal, countdown = "GREEN", state["greenDuration"]
            
            # Drift metrics
            density = max(0, min(100, state["densityScore"] + (random.random() - 0.48) * 2))
            stress = max(0, min(100, state["stressIndex"] + (random.random() - 0.49) * 1.5))
            spillover = min(100, density * 0.85 + random.random() * 10)
            qg = max(0, state["queueGrowthRate"] + (random.random() - 0.5) * 0.3)
            ql = max(0, state["queueLength"] + (2 if signal == "RED" else -1))
            
            state.update({
                "countdown": max(0, countdown),
                "currentSignal": signal,
                "densityScore": round(density, 1),
                "stressIndex": round(stress, 1),
                "spilloverRisk": round(spillover, 1),
                "queueGrowthRate": round(qg, 1),
                "queueLength": ql,
                "greenDuration": max(15, min(120, int(30 + 0.5 * density + 2.0 * qg))),
                "predictedCongestion": "CRITICAL" if density > 75 else "HIGH" if density > 55 else "MODERATE" if density > 35 else "LOW",
                "aiReasoning": compute_ai_reasoning(density, stress, spillover, qg, state["isEmergency"]),
                "lastUpdated": time.time(),
            })
        
        # Broadcast to websockets
        if active_websockets:
            payload = json.dumps({"type": "state_update", "data": traffic_state})
            dead = []
            for ws in active_websockets:
                try:
                    await ws.send_text(payload)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                active_websockets.remove(ws)

@app.on_event("startup")
async def startup():
    asyncio.create_task(simulation_tick())

# ── REST Endpoints ────────────────────────────────────────────
@app.get("/")
def root():
    return {"system": "HYDRA AI", "version": "1.0.0", "status": "ONLINE", "city": "Hyderabad"}

@app.get("/api/intersections")
def get_intersections():
    return {
        "count": len(INTERSECTIONS),
        "intersections": [
            {**meta, **traffic_state.get(meta["id"], {})}
            for meta in INTERSECTIONS
        ]
    }

@app.get("/api/intersections/{intersection_id}")
def get_intersection(intersection_id: str):
    meta = next((i for i in INTERSECTIONS if i["id"] == intersection_id), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Intersection not found")
    return {**meta, **traffic_state.get(intersection_id, {})}

@app.post("/api/scenario/{scenario_name}")
def set_scenario(scenario_name: str):
    valid = ["normal", "peak-hour", "accident", "ambulance-crisis"]
    if scenario_name not in valid:
        raise HTTPException(status_code=400, detail=f"Scenario must be one of: {valid}")
    
    global emergency_corridors
    for inter in INTERSECTIONS:
        traffic_state[inter["id"]] = init_intersection_state(inter["id"], scenario_name)
    
    if scenario_name == "ambulance-crisis":
        emergency_route = ["gachibowli-main", "kondapur-x", "madhapur-main", "hitech-flyover"]
        for eid in emergency_route:
            if eid in traffic_state:
                traffic_state[eid]["isEmergency"] = True
                traffic_state[eid]["currentSignal"] = "GREEN"
                traffic_state[eid]["countdown"] = 90
                traffic_state[eid]["vehicleCounts"]["ambulance"] = 1
                traffic_state[eid]["aiReasoning"] = "🚨 EMERGENCY: Ambulance detected. Green corridor active."
        emergency_corridors = [{"route": emergency_route, "active": True, "type": "ambulance"}]
    else:
        emergency_corridors = []
    
    return {"success": True, "scenario": scenario_name}

@app.post("/api/emergency/trigger")
def trigger_emergency(data: dict):
    route = data.get("route", ["gachibowli-main", "kondapur-x", "madhapur-main"])
    for eid in route:
        if eid in traffic_state:
            traffic_state[eid]["isEmergency"] = True
            traffic_state[eid]["currentSignal"] = "GREEN"
            traffic_state[eid]["countdown"] = 90
    emergency_corridors.append({"route": route, "active": True, "type": "ambulance", "triggeredAt": time.time()})
    return {"success": True, "route": route}

@app.post("/api/emergency/clear")
def clear_emergency():
    global emergency_corridors
    for state in traffic_state.values():
        state["isEmergency"] = False
        state["vehicleCounts"]["ambulance"] = 0
    emergency_corridors = []
    return {"success": True}

@app.get("/api/emergency/corridors")
def get_emergency_corridors():
    return {"corridors": emergency_corridors}

@app.get("/api/metrics/system")
def get_system_metrics():
    densities = [s["densityScore"] for s in traffic_state.values()]
    avg_density = sum(densities) / len(densities) if densities else 0
    return {
        "averageWaitTime": round(20 + avg_density * 0.5),
        "throughputRate": round(200 - avg_density * 0.8),
        "networkStress": round(avg_density),
        "signalEfficiency": round(100 - avg_density * 0.3),
        "activeIncidents": sum(1 for s in traffic_state.values() if s["stressIndex"] > 80),
        "fuelSaved": round(200 + random.random() * 100),
        "co2Reduced": round(160 + random.random() * 80),
    }

@app.get("/api/predictions")
def get_predictions():
    predictions = []
    for inter in INTERSECTIONS:
        state = traffic_state.get(inter["id"], {})
        density = state.get("densityScore", 0)
        risk = "CRITICAL" if density > 75 else "HIGH" if density > 55 else "MODERATE" if density > 35 else "LOW"
        predictions.append({
            "intersectionId": inter["id"],
            "intersectionName": inter["name"],
            "riskLevel": risk,
            "minutesAhead": round(2 + random.random() * 8),
            "confidence": round(65 + random.random() * 30),
            "reason": "High density + queue growth" if density > 60 else "Normal traffic patterns",
        })
    return {"predictions": predictions}

# ── WebSocket ────────────────────────────────────────────────
@app.websocket("/ws/traffic")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_websockets.append(websocket)
    try:
        # Send initial state
        await websocket.send_text(json.dumps({"type": "init", "data": traffic_state, "intersections": INTERSECTIONS}))
        while True:
            msg = await websocket.receive_text()
            data = json.loads(msg)
            if data.get("action") == "set_scenario":
                set_scenario(data.get("scenario", "normal"))
            elif data.get("action") == "trigger_emergency":
                trigger_emergency(data)
    except WebSocketDisconnect:
        active_websockets.remove(websocket)
    except Exception as e:
        if websocket in active_websockets:
            active_websockets.remove(websocket)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
