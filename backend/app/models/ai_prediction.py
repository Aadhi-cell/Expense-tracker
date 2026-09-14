from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prediction_type = Column(String, nullable=False) # e.g. "next_month_expense"
    predicted_amount = Column(Float, nullable=False)
    target_month = Column(Integer, nullable=False)
    target_year = Column(Integer, nullable=False)
    confidence_score = Column(Float, nullable=True)
    features_used = Column(String, nullable=True) # JSON string representation

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
