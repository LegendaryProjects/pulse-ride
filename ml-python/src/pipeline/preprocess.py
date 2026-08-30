import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

def extract_temporal_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df['date_obj'] = pd.to_datetime(df['date'])
    df['month'] = df['date_obj'].dt.month
    df['day_of_month'] = df['date_obj'].dt.day
    
    df = df.drop(columns=['date', 'date_obj']) # Drop raw date objects as XGBoost requires numerical inputs
    return df

def build_location_encoder() -> ColumnTransformer: #one-hot encoding
    return ColumnTransformer(
        transformers=[
            ("location_ohe", OneHotEncoder(handle_unknown="ignore"), ["place"])
        ],
        remainder="passthrough"  # Leaves month, day_of_month, day_of_week, hour, minute unchanged
    )