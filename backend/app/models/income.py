from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    source = Column(String, nullable=False)
    income_type = Column(String, nullable=False, default="Salary") # Salary, Business, Freelance, Bonus, Other
    payment_method = Column(String, nullable=False, default="Bank Transfer") # Bank Transfer, UPI, Cash, Cheque, Other
    income_date = Column(Date, nullable=False, index=True)
    is_recurring = Column(Boolean, default=False)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="incomes")
