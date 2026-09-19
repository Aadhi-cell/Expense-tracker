from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime, date
from typing import Optional
import calendar
from dateutil.relativedelta import relativedelta

from app.database.connection import get_db
from app.models.expense import Expense
from app.models.income import Income
from app.models.budget import Budget
from app.models.user import User
from app.models.monthly_savings import MonthlySavings
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

@router.get("/")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    now = datetime.now()
    current_month = month if month is not None else now.month
    current_year = year if year is not None else now.year

    _, last_day = calendar.monthrange(current_year, current_month)
    selected_month_start = date(current_year, current_month, 1)
    selected_month_end = date(current_year, current_month, last_day)

    # If viewing live current month, cutoff at today so future-dated income isn't counted in available cash yet!
    is_live_current_month = (current_year == now.year and current_month == now.month)
    cutoff_date = now.date() if is_live_current_month else selected_month_end

    # --- EXPENSES ---
    # Total expenses for selected month (uses indexed date range)
    monthly_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date >= selected_month_start,
        Expense.expense_date <= selected_month_end
    ).scalar() or 0.0

    # Total expenses up to cutoff date
    total_expenses = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date <= cutoff_date
    ).scalar() or 0.0

    # --- INCOMES ---
    # Monthly income for selected month (uses indexed date range)
    monthly_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        Income.income_date >= selected_month_start,
        Income.income_date <= selected_month_end
    ).scalar() or 0.0

    # Total income up to cutoff date (excludes future income until reached!)
    total_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        Income.income_date <= cutoff_date
    ).scalar() or 0.0

    # 1. Savings target manually set for the currently selected month
    current_month_rec = db.query(MonthlySavings).filter(
        MonthlySavings.user_id == current_user.id,
        MonthlySavings.month == current_month,
        MonthlySavings.year == current_year
    ).first()

    # Only set if manually added by user for this month!
    monthly_savings_target = float(current_month_rec.amount) if current_month_rec else 0.0

    # 2. Cumulative savings: sum of all manually added savings records up to this selected month
    savings_records_up_to_month = db.query(MonthlySavings).filter(
        MonthlySavings.user_id == current_user.id,
        (MonthlySavings.year < current_year) | 
        ((MonthlySavings.year == current_year) & (MonthlySavings.month <= current_month))
    ).all()

    cumulative_savings = sum(float(r.amount) for r in savings_records_up_to_month)

    # Available balance: Total realized income - realized expenses - cumulative savings set aside
    available_balance = (total_income - total_expenses) - cumulative_savings

    # Savings amount: The actual cumulative savings set aside up to this month
    savings_amount = cumulative_savings
    this_month_savings = monthly_savings_target
    savings_percentage = 100.0 if monthly_savings_target > 0 else 0.0

    # Category-wise expenses for current month
    category_expenses = db.query(
        Expense.category, func.sum(Expense.amount).label("total")
    ).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date >= selected_month_start,
        Expense.expense_date <= selected_month_end
    ).group_by(Expense.category).all()
    
    category_data = [{"category": cat, "amount": float(amount)} for cat, amount in category_expenses]

    # Recent transactions
    recent_transactions = db.query(Expense).filter(
        Expense.user_id == current_user.id
    ).order_by(Expense.expense_date.desc(), Expense.id.desc()).limit(6).all()

    # Budget status with warning levels - calculated in memory to eliminate N database queries!
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == current_month,
        Budget.year == current_year
    ).all()
    
    cat_spent_map = {str(cat).strip().lower(): float(amount) for cat, amount in category_expenses if cat}
    budget_status = []
    for budget in budgets:
        cat_lower = budget.category_name.strip().lower()
        aliases = CATEGORY_ALIASES.get(cat_lower, [cat_lower])
        spent = sum(cat_spent_map.get(a, 0.0) for a in aliases)

        pct = round((spent / budget.amount) * 100, 1) if budget.amount > 0 else 0
        if pct >= 100:
            alert_level = "exceeded"
        elif pct >= 90:
            alert_level = "critical"
        elif pct >= 75:
            alert_level = "warning"
        else:
            alert_level = "normal"

        budget_status.append({
            "id": budget.id,
            "category": budget.category_name,
            "budget_amount": budget.amount,
            "spent_amount": spent,
            "remaining": budget.amount - spent,
            "percentage_used": pct,
            "alert_level": alert_level
        })

    # Historical monthly trends (past 6 months ending at selected month)
    # Optimized: 2 single group_by queries instead of 12 sequential queries!
    selected_target = datetime(current_year, current_month, 1)
    oldest_month_date = (selected_target - relativedelta(months=5)).date()

    exp_trends = db.query(
        extract('year', Expense.expense_date).label('yr'),
        extract('month', Expense.expense_date).label('mo'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == current_user.id,
        Expense.expense_date >= oldest_month_date,
        Expense.expense_date <= selected_month_end
    ).group_by('yr', 'mo').all()
    exp_map = {(int(r.yr), int(r.mo)): float(r.total) for r in exp_trends}

    inc_trends = db.query(
        extract('year', Income.income_date).label('yr'),
        extract('month', Income.income_date).label('mo'),
        func.sum(Income.amount).label('total')
    ).filter(
        Income.user_id == current_user.id,
        Income.income_date >= oldest_month_date,
        Income.income_date <= selected_month_end
    ).group_by('yr', 'mo').all()
    inc_map = {(int(r.yr), int(r.mo)): float(r.total) for r in inc_trends}

    monthly_trends = []
    for i in range(5, -1, -1):
        target_date = selected_target - relativedelta(months=i)
        t_m = target_date.month
        t_y = target_date.year
        month_label = target_date.strftime("%b %Y")

        exp = exp_map.get((t_y, t_m), 0.0)
        inc = inc_map.get((t_y, t_m), 0.0)

        monthly_trends.append({
            "name": month_label,
            "expenses": float(exp),
            "income": float(inc),
            "savings": float(max(0, inc - exp))
        })

    return {
        "monthly_income": float(monthly_income),
        "total_income": float(total_income),
        "monthly_expenses": float(monthly_expenses),
        "total_expenses": float(total_expenses),
        "available_balance": float(available_balance),
        "savings_amount": float(savings_amount),
        "this_month_savings": float(this_month_savings),
        "monthly_savings_target": float(monthly_savings_target),
        "savings_percentage": float(savings_percentage),
        "category_expenses": category_data,
        "recent_transactions": recent_transactions,
        "budget_status": budget_status,
        "monthly_trends": monthly_trends,
        "selected_month": current_month,
        "selected_year": current_year
    }

@router.get("/monthly-expense-details")
def get_monthly_expense_details(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    now = datetime.now()
    current_month = month if month is not None else now.month
    current_year = year if year is not None else now.year

    _, last_day = calendar.monthrange(current_year, current_month)

    # 1. Fetch all expenses for this month
    expenses = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        extract('month', Expense.expense_date) == current_month,
        extract('year', Expense.expense_date) == current_year
    ).order_by(Expense.expense_date.desc(), Expense.id.desc()).all()

    total_spent = sum(exp.amount for exp in expenses)
    expense_count = len(expenses)

    # Fetch income and savings for this month
    monthly_income = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        extract('month', Income.income_date) == current_month,
        extract('year', Income.income_date) == current_year
    ).scalar() or 0.0

    current_month_rec = db.query(MonthlySavings).filter(
        MonthlySavings.user_id == current_user.id,
        MonthlySavings.month == current_month,
        MonthlySavings.year == current_year
    ).first()
    monthly_savings = float(current_month_rec.amount) if current_month_rec else 0.0

    savings_records_up_to_month = db.query(MonthlySavings).filter(
        MonthlySavings.user_id == current_user.id,
        (MonthlySavings.year < current_year) | 
        ((MonthlySavings.year == current_year) & (MonthlySavings.month <= current_month))
    ).all()
    cumulative_savings = sum(float(r.amount) for r in savings_records_up_to_month)

    # 2. Previous Month Comparison
    target_date = datetime(current_year, current_month, 1)
    prev_date = target_date - relativedelta(months=1)
    prev_month = prev_date.month
    prev_year = prev_date.year

    prev_spent = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        extract('month', Expense.expense_date) == prev_month,
        extract('year', Expense.expense_date) == prev_year
    ).scalar() or 0.0

    diff_vs_last_month = total_spent - prev_spent
    pct_change_vs_last_month = 0.0
    if prev_spent > 0:
        pct_change_vs_last_month = round(((total_spent - prev_spent) / prev_spent) * 100, 1)
    elif total_spent > 0:
        pct_change_vs_last_month = 100.0

    # 3. Daily Average & Projected Spend
    is_current_active_month = (current_year == now.year and current_month == now.month)
    days_elapsed = min(now.day, last_day) if is_current_active_month else last_day
    days_elapsed = max(1, days_elapsed)

    daily_average = round(total_spent / days_elapsed, 2)
    projected_month_end = round(daily_average * last_day, 2)

    # 4. Highest Spending Day
    day_totals = {}
    for exp in expenses:
        d_str = exp.expense_date.isoformat()
        day_totals[d_str] = day_totals.get(d_str, 0.0) + exp.amount

    highest_day = None
    if day_totals:
        max_d = max(day_totals, key=day_totals.get)
        highest_day = {"date": max_d, "amount": round(day_totals[max_d], 2)}

    # 5. Category Breakdown
    cat_map = {}
    for exp in expenses:
        cat = exp.category or "Other"
        if cat not in cat_map:
            cat_map[cat] = {"category": cat, "amount": 0.0, "count": 0}
        cat_map[cat]["amount"] += exp.amount
        cat_map[cat]["count"] += 1

    category_breakdown = sorted(
        [
            {
                "category": c["category"],
                "amount": round(c["amount"], 2),
                "count": c["count"],
                "percentage": round((c["amount"] / total_spent) * 100, 1) if total_spent > 0 else 0
            }
            for c in cat_map.values()
        ],
        key=lambda x: x["amount"],
        reverse=True
    )

    # 6. Payment Method Breakdown
    pm_map = {}
    for exp in expenses:
        pm = exp.payment_method or "Other"
        if pm not in pm_map:
            pm_map[pm] = {"payment_method": pm, "amount": 0.0, "count": 0}
        pm_map[pm]["amount"] += exp.amount
        pm_map[pm]["count"] += 1

    payment_method_breakdown = sorted(
        [
            {
                "payment_method": p["payment_method"],
                "amount": round(p["amount"], 2),
                "count": p["count"],
                "percentage": round((p["amount"] / total_spent) * 100, 1) if total_spent > 0 else 0
            }
            for p in pm_map.values()
        ],
        key=lambda x: x["amount"],
        reverse=True
    )

    # 7. Top 5 Largest Expenses
    top_expenses = [
        {
            "id": exp.id,
            "description": exp.description,
            "amount": round(exp.amount, 2),
            "category": exp.category,
            "payment_method": exp.payment_method,
            "expense_date": exp.expense_date.isoformat(),
            "merchant": exp.merchant,
            "notes": exp.notes
        }
        for exp in sorted(expenses, key=lambda x: x.amount, reverse=True)[:5]
    ]

    # 8. Budget Status & Total Budget Comparison
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == current_month,
        Budget.year == current_year
    ).all()

    total_budget = sum(b.amount for b in budgets)
    budget_alerts = []
    for budget in budgets:
        spent = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            get_category_filter(budget.category_name),
            extract('month', Expense.expense_date) == current_month,
            extract('year', Expense.expense_date) == current_year
        ).scalar() or 0.0

        pct = round((spent / budget.amount) * 100, 1) if budget.amount > 0 else 0
        if pct >= 75:
            budget_alerts.append({
                "category": budget.category_name,
                "budget_amount": budget.amount,
                "spent_amount": spent,
                "percentage_used": pct,
                "alert_level": "exceeded" if pct >= 100 else ("critical" if pct >= 90 else "warning")
            })

    # 9. All Monthly Transactions Formatted
    transaction_list = [
        {
            "id": exp.id,
            "description": exp.description,
            "amount": round(exp.amount, 2),
            "category": exp.category,
            "payment_method": exp.payment_method,
            "expense_date": exp.expense_date.isoformat(),
            "merchant": exp.merchant,
            "notes": exp.notes
        }
        for exp in expenses
    ]

    return {
        "selected_month": current_month,
        "selected_year": current_year,
        "month_name": calendar.month_name[current_month],
        "total_spent": round(total_spent, 2),
        "expense_count": expense_count,
        "total_budget": round(total_budget, 2),
        "budget_percentage": round((total_spent / total_budget) * 100, 1) if total_budget > 0 else None,
        "remaining_budget": round(total_budget - total_spent, 2) if total_budget > 0 else None,
        "previous_month_spent": round(prev_spent, 2),
        "prev_month_name": calendar.month_name[prev_month],
        "diff_vs_last_month": round(diff_vs_last_month, 2),
        "pct_change_vs_last_month": pct_change_vs_last_month,
        "daily_average": daily_average,
        "days_elapsed": days_elapsed,
        "total_days_in_month": last_day,
        "projected_month_end": projected_month_end,
        "highest_spending_day": highest_day,
        "category_breakdown": category_breakdown,
        "payment_method_breakdown": payment_method_breakdown,
        "top_expenses": top_expenses,
        "budget_alerts": budget_alerts,
        "transactions": transaction_list,
        "monthly_income": round(monthly_income, 2),
        "monthly_savings": round(monthly_savings, 2),
        "cumulative_savings": round(cumulative_savings, 2)
    }

class SavingsTargetRequest(BaseModel):
    target: float
    month: Optional[int] = None
    year: Optional[int] = None

@router.post("/savings-target")
def update_savings_target(
    target_in: SavingsTargetRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_val = max(0.0, float(target_in.target))
    current_user.monthly_savings_target = target_val
    db.add(current_user)

    if target_in.month and target_in.year:
        rec = db.query(MonthlySavings).filter(
            MonthlySavings.user_id == current_user.id,
            MonthlySavings.month == target_in.month,
            MonthlySavings.year == target_in.year
        ).first()
        if rec:
            rec.amount = target_val
        else:
            rec = MonthlySavings(
                user_id=current_user.id,
                month=target_in.month,
                year=target_in.year,
                amount=target_val
            )
            db.add(rec)

    db.commit()
    db.refresh(current_user)
    return {
        "message": "Monthly savings target updated successfully",
        "monthly_savings_target": current_user.monthly_savings_target
    }
