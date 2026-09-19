from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base

class MonthlySavings(Base):
    __tablename__ = "monthly_savings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    month = Column(Integer, nullable=False, index=True) # 1-12
    year = Column(Integer, nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0.0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="monthly_savings_records")

    __table_args__ = (
        UniqueConstraint('user_id', 'month', 'year', name='uq_user_month_year_savings'),
    )
