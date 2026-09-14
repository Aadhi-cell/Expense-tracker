from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from typing import List, Optional

from app.database.connection import get_db
from app.models.budget import Budget
from app.models.expense import Expense
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.api.auth import get_current_user

router = APIRouter()

CATEGORY_ALIASES = {
    "food": ["food", "food & dining", "food and dining", "dining"],
    "food & dining": ["food", "food & dining", "food and dining", "dining"],
    "food and dining": ["food", "food & dining", "food and dining", "dining"],
    "dining": ["food", "food & dining", "food and dining", "dining"],
    "bills": ["bills", "utilities", "bills & utilities"],
    "utilities": ["bills", "utilities", "bills & utilities"],
    "bills & utilities": ["bills", "utilities", "bills & utilities"],
}

def get_category_filter(category_name: str):
    cat_lower = category_name.strip().lower()
    matched = CATEGORY_ALIASES.get(cat_lower, [cat_lower])
    return func.lower(func.trim(Expense.category)).in_(matched)

@router.get("/", response_model=List[BudgetResponse])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    query = db.query(Budget).filter(Budget.user_id == current_user.id)
    if month:
        query = query.filter(Budget.month == month)
    if year:
        query = query.filter(Budget.year == year)
    
    budgets = query.all()
    results = []
    
    for b in budgets:
        # Calculate actual spent for this category and month/year
        spent = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            get_category_filter(b.category_name),
            extract('month', Expense.expense_date) == b.month,
            extract('year', Expense.expense_date) == b.year
        ).scalar() or 0.0

        pct = round((spent / b.amount) * 100, 1) if b.amount > 0 else 0.0
        if pct >= 100:
            alert = "exceeded"
        elif pct >= 90:
            alert = "critical"
        elif pct >= 75:
            alert = "warning"
        else:
            alert = "normal"

        budget_dict = {
            "id": b.id,
            "user_id": b.user_id,
            "category_name": b.category_name,
            "category_id": b.category_id,
            "amount": b.amount,
            "month": b.month,
            "year": b.year,
            "created_at": b.created_at,
            "updated_at": b.updated_at,
            "spent_amount": spent,
            "remaining": b.amount - spent,
            "percentage_used": pct,
            "alert_level": alert
        }
        results.append(BudgetResponse(**budget_dict))

    return results

@router.post("/", response_model=BudgetResponse)
def create_budget(
    budget_in: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_name == budget_in.category_name,
        Budget.month == budget_in.month,
        Budget.year == budget_in.year
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Budget for this category in this month already exists")
        
    db_budget = Budget(**budget_in.model_dump(), user_id=current_user.id)
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)

    # Attach computed fields
    spent = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        get_category_filter(db_budget.category_name),
        extract('month', Expense.expense_date) == db_budget.month,
        extract('year', Expense.expense_date) == db_budget.year
    ).scalar() or 0.0

    pct = round((spent / db_budget.amount) * 100, 1) if db_budget.amount > 0 else 0.0
    return BudgetResponse(
        id=db_budget.id,
        user_id=db_budget.user_id,
        category_name=db_budget.category_name,
        category_id=db_budget.category_id,
        amount=db_budget.amount,
        month=db_budget.month,
        year=db_budget.year,
        created_at=db_budget.created_at,
        updated_at=db_budget.updated_at,
        spent_amount=spent,
        remaining=db_budget.amount - spent,
        percentage_used=pct,
        alert_level="exceeded" if pct >= 100 else ("critical" if pct >= 90 else ("warning" if pct >= 75 else "normal"))
    )

@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    budget_in: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    update_data = budget_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_budget, field, value)
        
    db.add(db_budget)
    db.commit()
    db.refresh(db_budget)

    spent = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        get_category_filter(db_budget.category_name),
        extract('month', Expense.expense_date) == db_budget.month,
        extract('year', Expense.expense_date) == db_budget.year
    ).scalar() or 0.0

    pct = round((spent / db_budget.amount) * 100, 1) if db_budget.amount > 0 else 0.0
    return BudgetResponse(
        id=db_budget.id,
        user_id=db_budget.user_id,
        category_name=db_budget.category_name,
        category_id=db_budget.category_id,
        amount=db_budget.amount,
        month=db_budget.month,
        year=db_budget.year,
        created_at=db_budget.created_at,
        updated_at=db_budget.updated_at,
        spent_amount=spent,
        remaining=db_budget.amount - spent,
        percentage_used=pct,
        alert_level="exceeded" if pct >= 100 else ("critical" if pct >= 90 else ("warning" if pct >= 75 else "normal"))
    )

@router.delete("/{budget_id}")
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db_budget = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not db_budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    db.delete(db_budget)
    db.commit()
    return {"message": "Budget deleted successfully"}
