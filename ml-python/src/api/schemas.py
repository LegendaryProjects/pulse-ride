from pydantic import BaseModel, Field

class CrowdPredictionRequest(BaseModel):
    """Input features required to forecast crowd size at a location."""
    date: str = Field(..., example="2026-08-30", description="Date in YYYY-MM-DD format")
    day_of_week: int = Field(..., ge=0, le=6, description="0 = Monday, 6 = Sunday")
    hour: int = Field(..., ge=0, le=23, description="Hour of the day (24h format)")
    minute: int = Field(..., ge=0, le=59, description="Minute of the hour")
    place: str = Field(..., example="Mega Towers", description="Campus stop or hotspot name")
    is_holiday: bool = Field(False, description="Flag indicating if the date is an official campus holiday")

class CrowdPredictionResponse(BaseModel):
    """Output returning the predicted crowd size for repositioning logic."""
    place: str
    timestamp: str
    predicted_students_count: int
    recommended_vehicle: str