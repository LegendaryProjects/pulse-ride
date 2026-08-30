# Pulse Ride ML

This module powers the campus-demand prediction behind Pulse Ride. It trains a model to estimate how many students are likely to be at a stop at a given time, then exposes that prediction through a small FastAPI service for the app.

## What it does

- Loads and prepares crowd data from `data/raw_dataset.csv`
- Builds temporal features such as month, day of month, weekday, hour, and minute
- Encodes stop/location names for model input
- Trains an optimized XGBoost regressor for student demand prediction
- Saves the trained model to `models/xgboost_demand_model.joblib`
- Exposes a prediction API at `/predict-crowd`
- Returns a recommended vehicle based on predicted crowd size
- Short-circuits weekends and holidays to return zero demand automatically

## Project structure

- `src/pipeline/preprocess.py` — prepares time-based features and location encoding
- `src/pipeline/train.py` — loads data, tunes hyperparameters, trains the model, and saves it
- `src/api/main.py` — FastAPI app that loads the model and serves predictions
- `src/api/schemas.py` — request/response models for the API
- `data/raw_dataset.csv` — training data for actual demand forecasting
- `models/` — saved trained model artifact

## Setup

```bash
cd ml-python
pip install -r requirements.txt
```

## Train the model

```bash
python src/pipeline/train.py
```

If no dataset is found, the training script falls back to a small synthetic campus dataset so the workflow still runs.

## Run the API

```bash
uvicorn src.api.main:app --reload
```

Then send a POST request to:

```http
http://127.0.0.1:8000/predict-crowd
```

Example payload:

```json
{
  "date": "2026-08-30",
  "day_of_week": 6,
  "hour": 17,
  "minute": 15,
  "place": "Mega Towers",
  "is_holiday": false
}
```

## Result

The API returns:

- predicted student count
- recommended vehicle type
- location and timestamp

This helps the frontend decide when and where to dispatch a ride vehicle based on expected crowding.
