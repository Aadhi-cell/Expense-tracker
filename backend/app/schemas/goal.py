from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class GoalBase(BaseModel):
    name: str
    target_amount: float
    target_date: Optional[date] = None

class GoalCreate(GoalBase):
    pass

class GoalUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None

class GoalInDBBase(GoalBase):
    id: int
    user_id: int
    current_amount: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GoalResponse(GoalInDBBase):
    pass
