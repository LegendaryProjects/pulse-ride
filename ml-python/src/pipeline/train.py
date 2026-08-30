import pandas as pd
import xgboost as xgb
from sklearn.pipeline import Pipeline
from sklearn.model_selection import GridSearchCV
import joblib
import os
from preprocess import extract_temporal_features, build_location_encoder

DATA_PATH = os.path.join(os.path.dirname(__file__), '../../data/raw_dataset.csv')
MODEL_SAVE_PATH = os.path.join(os.path.dirname(__file__), '../../models/xgboost_demand_model.joblib')

def generate_fallback_dataset():
    """Generates synthetic NITK campus crowd records if the CSV has not yet been populated."""
    print("No CSV found at data/raw_dataset.csv. Training on fallback baseline records...")
    return pd.DataFrame({
        "date": [
            "2026-08-31", "2026-08-31", "2026-08-31", "2026-08-31",
            "2026-08-31", "2026-08-31", "2026-08-31", "2026-08-31"
        ],
        "day_of_week": [0, 0, 0, 0, 0, 0, 0, 0],  # Monday
        "hour": [8, 8, 12, 12, 17, 17, 21, 21],
        "minute": [0, 15, 30, 45, 0, 15, 0, 30],
        "place": [
            "Mega Towers", "Girls Hostel", "LHC-C", "LHC-D",
            "LHC-C", "Library", "Library", "NITK Beach"
        ],
        "students_count": [52, 44, 28, 35, 48, 22, 18, 5]
    })

def train_crowd_model():
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        print(f"Loaded {len(df)} records from the dataset: {DATA_PATH}")
    else:
        df = generate_fallback_dataset()

    df = extract_temporal_features(df)

    X = df[["month", "day_of_month", "day_of_week", "hour", "minute", "place", "is_holiday"]]
    y = df["students_count"]

    pipeline = Pipeline(steps=[
        ("encoder", build_location_encoder()),
        ("regressor", xgb.XGBRegressor(
            random_state=42,
            objective="reg:squarederror"
        ))
    ])

    param_grid = {
        'regressor__max_depth': [3, 4, 5],
        'regressor__learning_rate': [0.05, 0.08, 0.1],
        'regressor__n_estimators': [100, 150, 200],
        'regressor__subsample': [0.8, 1.0],
        'regressor__colsample_bytree': [0.8, 1.0]
    }

    print("Running GridSearchCV to find good hyperparameters")
    
    grid_search = GridSearchCV(
        estimator=pipeline,
        param_grid=param_grid,
        cv=3,  # Splits into 3 chunks
        scoring='neg_mean_squared_error',
        verbose=1,
        n_jobs=-1 #all_cores
    )

    grid_search.fit(X, y)

    print(f"Good Hyperparameters Found: {grid_search.best_params_}")

    best_model = grid_search.best_estimator_
    
    os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)
    joblib.dump(best_model, MODEL_SAVE_PATH)
    print(f"Optimized XGBoost model successfully saved to: {MODEL_SAVE_PATH}")

if __name__ == "__main__":
    train_crowd_model()