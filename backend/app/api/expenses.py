from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, extract
from typing import List, Optional
from datetime import date

from app.database.connection import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse
from app.api.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    category: Optional[str] = None,
    search: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 200
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)

    if category and category != "All":
        query = query.filter(Expense.category == category)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Expense.description.ilike(search_pattern),
                Expense.merchant.ilike(search_pattern),
                Expense.notes.ilike(search_pattern)
            )
        )

    if month:
        query = query.filter(extract('month', Expense.expense_date) == month)
    if year:
        query = query.filter(extract('year', Expense.expense_date) == year)

    if start_date:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date:
        query = query.filter(Expense.expense_date <= end_date)

    return query.order_by(Expense.expense_date.desc(), Expense.id.desc()).offset(skip).limit(limit).all()

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = Expense(**expense_in.model_dump(), user_id=current_user.id)
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/{expense_id}", response_model=ExpenseResponse)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_in: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = expense_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)
        
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.delete("/{expense_id}", response_model=ExpenseResponse)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_expense = db.query(Expense).filter(Expense.id == expense_id, Expense.user_id == current_user.id).first()
    if not db_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    db.delete(db_expense)
    db.commit()
    return db_expense
