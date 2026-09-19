from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True) # store name for simplicity and fallback
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    payment_method = Column(String, nullable=False)
    expense_date = Column(Date, nullable=False, index=True)
    merchant = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="expenses")
    category_rel = relationship("Category", back_populates="expenses")
