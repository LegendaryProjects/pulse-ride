import os
import sys
import pickle
import pandas as pd
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from extract_features import extract_temporal_features
except ImportError:
    from ..features.extract_features import extract_temporal_features

app = FastAPI(
    title="Pulse Ride ML Microservice",
    description="Campus Shared-Mobility Crowd Prediction & Hotspot Dispatch Engine",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained XGBoost model if available
MODEL_PATH = os.path.join(os.path.dirname(__file__), "../models/crowd_prediction_model.pkl")
crowd_model = None

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, "rb") as f:
            crowd_model = pickle.load(f)
        print("✅ Trained crowd prediction model loaded successfully.")
    except Exception as e:
        print("⚠️ Failed to load ML model, using heuristic backup:", e)

CAMPUS_STOPS = [
    "Mega Towers", "LHC-C", "LHC-D", "Main Library", "Girls Hostel", 
    "Adke Circle", "Karavali Hostel", "NITK Beach Gate", "Girls Coop", "Guest House"
]

STOP_PEAK_TIMES = {
    "Mega Towers": "Morning 8:00 AM",
    "LHC-C": "Evening 5:00 PM",
    "LHC-D": "Morning 8:45 AM",
    "Main Library": "Evening 6:30 PM",
    "Girls Hostel": "Morning 8:15 AM",
    "Adke Circle": "Afternoon 1:15 PM",
    "Karavali Hostel": "Morning 8:30 AM",
    "NITK Beach Gate": "Evening 5:30 PM",
    "Girls Coop": "Afternoon 12:45 PM",
    "Guest House": "Morning 9:30 AM"
}

class CrowdPredictionRequest(BaseModel):
    date: Optional[str] = "2026-08-31"
    day_of_week: Optional[int] = 0
    hour: Optional[int] = 8
    minute: Optional[int] = 0
    place: Optional[str] = "LHC-C"
    is_holiday: Optional[bool] = False

class CrowdPredictionResponse(BaseModel):
    place: str
    timestamp: str
    peak_time: Optional[str] = None
    predicted_students_count: int
    recommended_vehicle: str

def determine_vehicle(student_count: int) -> str:
    if student_count >= 5:
        return "Bus"
    elif student_count >= 2:
        return "Buggy"
    elif student_count == 1:
        return "2-Wheeler"
    return "None"

class HotspotsRequest(BaseModel):
    date: Optional[str] = None
    hour: Optional[int] = 8
    is_holiday: Optional[bool] = False

@app.get("/health")
def health_check():
    return {"status": "ML microservice is operational", "model_loaded": crowd_model is not None}

@app.post("/predict-crowd", response_model=CrowdPredictionResponse)
def predict_crowd(request: CrowdPredictionRequest):
    # Proactive short circuit on holidays or weekends
    if request.is_holiday or request.day_of_week in [5, 6]:
        return CrowdPredictionResponse(
            place=request.place,
            timestamp=f"{request.hour:02d}:{request.minute:02d}",
            peak_time=STOP_PEAK_TIMES.get(request.place, "Morning 8:00 AM"),
            predicted_students_count=0,
            recommended_vehicle="None"
        )

    if crowd_model is not None:
        try:
            input_df = pd.DataFrame([{
                "date": request.date,
                "day_of_week": request.day_of_week,
                "hour": request.hour,
                "minute": request.minute,
                "place": request.place,
                "is_holiday": request.is_holiday
            }])
            processed_df = extract_temporal_features(input_df)
            raw_pred = crowd_model.predict(processed_df)[0]
            predicted_students = max(0, int(round(raw_pred)))
        except Exception as err:
            print("Model prediction fallback:", err)
            predicted_students = 25 if "Hostel" in request.place or "Towers" in request.place else 15
    else:
        # Heuristic fallback based on campus stop patterns
        h = request.hour
        if h in [8, 9, 13, 17]:
            predicted_students = 35 if "Hostel" in request.place or "Towers" in request.place else 25
        else:
            predicted_students = 12

    vehicle_rec = determine_vehicle(predicted_students)

    return CrowdPredictionResponse(
        place=request.place,
        timestamp=f"{request.hour:02d}:{request.minute:02d}",
        peak_time=STOP_PEAK_TIMES.get(request.place, "Morning 8:00 AM"),
        predicted_students_count=predicted_students,
        recommended_vehicle=vehicle_rec
    )

@app.post("/predict-hotspots")
def predict_campus_hotspots(req: HotspotsRequest):
    results = []
    current_hour = req.hour if req.hour is not None else 8
    target_date = req.date or "2026-08-31"

    for stop in CAMPUS_STOPS:
        # Predict for each campus stop
        if crowd_model is not None:
            try:
                input_df = pd.DataFrame([{
                    "date": target_date,
                    "day_of_week": 0,
                    "hour": current_hour,
                    "minute": 0,
                    "place": stop,
                    "is_holiday": req.is_holiday
                }])
                processed_df = extract_temporal_features(input_df)
                raw_pred = crowd_model.predict(processed_df)[0]
                count = max(0, int(round(raw_pred)))
            except Exception:
                count = 35 if "Towers" in stop or "LHC" in stop else 15
        else:
            if current_hour in [8, 9, 12, 17]:
                count = 45 if "Towers" in stop else (38 if "LHC" in stop else 20)
            else:
                count = 15

        rec = determine_vehicle(count)
        urgency = "HIGH" if count >= 30 else ("MEDIUM" if count >= 10 else "LOW")
        results.append({
            "place": stop,
            "peak_time": STOP_PEAK_TIMES.get(stop, "Morning 8:00 AM"),
            "predicted_students": count,
            "recommended_vehicle": rec,
            "urgency": urgency
        })

    # Sort descending by predicted student crowd
    results.sort(key=lambda x: x["predicted_students"], reverse=True)

    top_stop = results[0]["place"]
    top_count = results[0]["predicted_students"]
    top_peak = results[0]["peak_time"]

    return {
        "hour": current_hour,
        "date": target_date,
        "hotspots": results[:5],
        "all_stops": results,
        "alert": f"Peak demand forecasted at {top_stop} ({top_count} students expected at {top_peak})."
    }

@app.post("/train")
def train_model_endpoint():
    try:
        from train import train_crowd_model
        train_crowd_model()
        return {"success": True, "message": "XGBoost model retraining completed successfully."}
    except Exception as e:
        return {"success": False, "error": str(e)}