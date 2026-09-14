from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class IncomeBase(BaseModel):
    amount: float
    source: str
    income_type: str = "Salary"
    payment_method: str = "Bank Transfer"
    income_date: date
    is_recurring: bool = False
    notes: Optional[str] = None

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    source: Optional[str] = None
    income_type: Optional[str] = None
    payment_method: Optional[str] = None
    income_date: Optional[date] = None
    is_recurring: Optional[bool] = None
    notes: Optional[str] = None

class IncomeInDBBase(IncomeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class IncomeResponse(IncomeInDBBase):
    pass
