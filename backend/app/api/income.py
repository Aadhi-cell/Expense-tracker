from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
from typing import List, Optional
from datetime import datetime

from app.database.connection import get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[IncomeResponse])
def get_incomes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None,
    income_type: Optional[str] = None,
    payment_method: Optional[str] = None
):
    query = db.query(Income).filter(Income.user_id == current_user.id)
    if month:
        query = query.filter(extract('month', Income.income_date) == month)
    if year:
        query = query.filter(extract('year', Income.income_date) == year)
    if income_type and income_type != "All":
        query = query.filter(Income.income_type == income_type)
    if payment_method and payment_method != "All":
        query = query.filter(Income.payment_method == payment_method)
    
    return query.order_by(Income.income_date.desc()).all()


@router.get("/summary")
def get_income_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    current_month = month or datetime.now().month
    current_year = year or datetime.now().year

    # Current month total
    monthly_total = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        extract('month', Income.income_date) == current_month,
        extract('year', Income.income_date) == current_year
    ).scalar() or 0.0

    # Total all-time
    total_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id
    ).scalar() or 0.0

    # Recurring monthly income
    recurring_total = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        Income.is_recurring == True
    ).scalar() or 0.0

    # Breakdown by type for current month
    type_breakdown = db.query(
        Income.income_type, func.sum(Income.amount).label("total")
    ).filter(
        Income.user_id == current_user.id,
        extract('month', Income.income_date) == current_month,
        extract('year', Income.income_date) == current_year
    ).group_by(Income.income_type).all()

    return {
        "monthly_income": monthly_total,
        "total_income": total_income,
        "recurring_income": recurring_total,
        "type_breakdown": [{"type": t, "amount": amt} for t, amt in type_breakdown]
    }

@router.post("/", response_model=IncomeResponse)
def create_income(
    income_in: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_income = Income(**income_in.model_dump(), user_id=current_user.id)
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: int,
    income_in: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_income = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Income record not found")
    
    update_data = income_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_income, field, value)
        
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@router.delete("/{income_id}")
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_income = db.query(Income).filter(Income.id == income_id, Income.user_id == current_user.id).first()
    if not db_income:
        raise HTTPException(status_code=404, detail="Income record not found")
    
    db.delete(db_income)
    db.commit()
    return {"message": "Income record deleted successfully"}
