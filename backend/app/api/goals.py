from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.models.goal import FinancialGoal
from app.models.user import User
from app.schemas.goal import GoalCreate, GoalUpdate, GoalResponse
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[GoalResponse])
def get_goals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).all()

@router.post("/", response_model=GoalResponse)
def create_goal(
    goal_in: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = FinancialGoal(**goal_in.model_dump(), user_id=current_user.id)
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.put("/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_in: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    update_data = goal_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_goal, field, value)
        
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.post("/{goal_id}/contribute", response_model=GoalResponse)
def contribute_to_goal(
    goal_id: int,
    amount: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Contribution amount must be positive")

    db_goal.current_amount = (db_goal.current_amount or 0.0) + amount
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db.delete(db_goal)
    db.commit()
    return {"message": "Goal deleted successfully"}

