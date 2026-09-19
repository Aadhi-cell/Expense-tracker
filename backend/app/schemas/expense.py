from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ExpenseBase(BaseModel):
    amount: float
    description: str
    category: str
    payment_method: str
    expense_date: date
    merchant: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    amount: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    expense_date: Optional[date] = None

class ExpenseInDBBase(ExpenseBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ExpenseResponse(ExpenseInDBBase):
    pass
