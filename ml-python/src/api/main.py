from fastapi import FastAPI, HTTPException
import pandas as pd
import joblib
import os
import sys
from contextlib import asynccontextmanager

sys.path.append(os.path.join(os.path.dirname(__file__), '../pipeline'))
from preprocess import extract_temporal_features
from schemas import CrowdPredictionRequest, CrowdPredictionResponse

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../models/xgboost_demand_model.joblib')
crowd_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global crowd_model
    if os.path.exists(MODEL_PATH):
        crowd_model = joblib.load(MODEL_PATH)
        print("Model loaded successfully.")
    else:
        print("Please execute train.py first.")
    yield 
    crowd_model = None

app = FastAPI(
    title="Pulse Ride",
    description="Forecasts student crowd concentrations across campus stops.",
    lifespan=lifespan
)

def determine_vehicle(student_count: int) -> str:
    if student_count > 100:
        return "2 Buses (High Crowd)"
    elif student_count > 4:
        return "Bus"
    elif student_count > 1:
        return "Buggy"
    elif student_count == 1:
        return "2-Wheeler"
    return "None"

@app.post("/predict-crowd", response_model=CrowdPredictionResponse)
def predict_crowd(request: CrowdPredictionRequest):
    # --- PROACTIVE SHORT-CIRCUIT ---
    # Instantly return 0 if it is a holiday, a Saturday (5), or a Sunday (6)
    if request.is_holiday or request.day_of_week in [5, 6]:
        return CrowdPredictionResponse(
            place=request.place,
            timestamp=f"{request.hour:02d}:{request.minute:02d}",
            predicted_students_count=0,
            recommended_vehicle="None"
        )

    if crowd_model is None:
        raise HTTPException(status_code=500, detail="ML model is not loaded in memory.")

    input_df = pd.DataFrame([{
        "date": request.date,
        "day_of_week": request.day_of_week,
        "hour": request.hour,
        "minute": request.minute,
        "place": request.place
    }])

    processed_df = extract_temporal_features(input_df) 
    raw_prediction = crowd_model.predict(processed_df)[0] 
    predicted_students = max(0, int(round(raw_prediction)))

    vehicle_rec = determine_vehicle(predicted_students)

    return CrowdPredictionResponse(
        place=request.place,
        timestamp=f"{request.hour:02d}:{request.minute:02d}",
        predicted_students_count=predicted_students,
        recommended_vehicle=vehicle_rec
    )