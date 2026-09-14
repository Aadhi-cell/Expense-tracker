from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class NaturalLanguageExpenseRequest(BaseModel):
    text: str

class NaturalLanguageExpenseResponse(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    date: Optional[str] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    confidence: float

class CategorizeRequest(BaseModel):
    description: str

class CategorizeResponse(BaseModel):
    category: str
    confidence: float

class PredictExpensesResponse(BaseModel):
    predicted_amount: float
    prediction_period: str
    factors: List[str]

class AnomalyDetectionRequest(BaseModel):
    amount: float
    category: str

class AnomalyDetectionResponse(BaseModel):
    is_anomaly: bool
    anomaly_score: float
    explanation: str

class InsightResponse(BaseModel):
    insights: List[str]
