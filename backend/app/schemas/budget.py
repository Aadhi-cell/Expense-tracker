from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class BudgetBase(BaseModel):
    category_name: str
    amount: float
    month: int
    year: int
    category_id: Optional[int] = None

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(BaseModel):
    category_name: Optional[str] = None
    amount: Optional[float] = None
    month: Optional[int] = None
    year: Optional[int] = None

class BudgetInDBBase(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class BudgetResponse(BudgetInDBBase):
    spent_amount: Optional[float] = 0.0
    remaining: Optional[float] = 0.0
    percentage_used: Optional[float] = 0.0
    alert_level: Optional[str] = "normal"

