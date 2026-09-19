import re
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract, func
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LinearRegression

from app.database.connection import get_db
from app.models.user import User
from app.models.expense import Expense
from app.models.income import Income
from app.models.budget import Budget
from app.api.auth import get_current_user
from app.schemas.ai import (
    NaturalLanguageExpenseRequest, NaturalLanguageExpenseResponse,
    CategorizeRequest, CategorizeResponse,
    PredictExpensesResponse, AnomalyDetectionRequest, AnomalyDetectionResponse,
    InsightResponse
)

router = APIRouter()

SEED_DATA = [
    # Food & Dining
    ("dinner at kfc", "Food"),
    ("lunch with friends", "Food"),
    ("burger and fries", "Food"),
    ("starbucks coffee cafe", "Food"),
    ("pizza domino's", "Food"),
    ("restaurant food meal", "Food"),
    ("biryani hotel food", "Food"),
    ("swiggy zomato food order", "Food"),
    ("breakfast tea snacks", "Food"),
    
    # Groceries
    ("groceries at walmart", "Groceries"),
    ("milk and eggs supermarket", "Groceries"),
    ("vegetables and fruits", "Groceries"),
    ("supermarket grocery provision", "Groceries"),
    ("zepto blinkit groceries", "Groceries"),
    
    # Transportation
    ("uber ride to office", "Transportation"),
    ("ola cab booking", "Transportation"),
    ("metro train card recharge", "Transportation"),
    ("petrol fuel refill gas", "Transportation"),
    ("diesel fuel vehicle", "Transportation"),
    ("auto fare rapido bike", "Transportation"),
    ("car service maintenance", "Transportation"),
    ("bus fare toll gate", "Transportation"),

    # Travel
    ("flight ticket airline", "Travel"),
    ("train ticket irctc", "Travel"),
    ("hotel booking stay", "Travel"),
    ("vacation holiday trip resort", "Travel"),
    ("chennai travel journey", "Travel"),
    ("intercity bus travel", "Travel"),

    # Shopping
    ("amazon online shopping clothes", "Shopping"),
    ("new shoes nike", "Shopping"),
    ("zara jacket buy", "Shopping"),
    ("electronics headphones sony", "Shopping"),
    ("flipkart myntra shopping dress", "Shopping"),

    # Bills
    ("electricity bill payment", "Bills"),
    ("wifi internet broadband recharge", "Bills"),
    ("water utility bill", "Bills"),
    ("mobile recharge phone postpaid", "Bills"),
    ("gas cylinder booking", "Bills"),

    # Entertainment
    ("netflix monthly subscription", "Entertainment"),
    ("spotify music subscription", "Entertainment"),
    ("cinema movie tickets pvr", "Entertainment"),
    ("gaming steam game purchase", "Entertainment"),

    # Healthcare
    ("doctor visit consultation fee", "Healthcare"),
    ("pharmacy medicine buy", "Healthcare"),
    ("dental clinic checkup", "Healthcare"),
    ("fever paracetamol tablets", "Healthcare"),
    ("fever medicine clinic", "Healthcare"),
    ("hospital treatment bill", "Healthcare"),
    ("cough cold syrup tablets", "Healthcare"),
    ("headache pain balm", "Healthcare"),
    ("blood test lab scan", "Healthcare"),
    ("medical shop medicines", "Healthcare"),
    ("dentist tooth extraction", "Healthcare"),
    ("eye test glasses optical", "Healthcare"),

    # Fitness
    ("gym membership monthly", "Fitness"),
    ("yoga classes protein", "Fitness"),

    # Education
    ("books purchase kindle", "Education"),
    ("coursera online course subscription", "Education"),
    ("college school tuition fee", "Education"),

    # Housing
    ("house rent monthly payment", "Housing"),
    ("apartment maintenance fee", "Housing"),

    # Personal Care
    ("haircut salon spa", "Personal Care"),
    ("beauty parlour skincare", "Personal Care")
]

_BASE_VECTORIZER = None
_BASE_MODEL = None

def get_base_classifier():
    global _BASE_VECTORIZER, _BASE_MODEL
    if _BASE_VECTORIZER is None or _BASE_MODEL is None:
        texts = [item[0] for item in SEED_DATA]
        labels = [item[1] for item in SEED_DATA]
        vec = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
        X = vec.fit_transform(texts)
        clf = MultinomialNB()
        clf.fit(X, labels)
        _BASE_VECTORIZER = vec
        _BASE_MODEL = clf
    return _BASE_VECTORIZER, _BASE_MODEL

def get_category_classifier(user_expenses: List[Expense] = None):
    if not user_expenses:
        return get_base_classifier()

    texts = [item[0] for item in SEED_DATA]
    labels = [item[1] for item in SEED_DATA]

    has_custom = False
    for exp in user_expenses:
        if exp.description and exp.category:
            texts.append(exp.description.lower())
            labels.append(exp.category)
            has_custom = True
            if exp.merchant:
                texts.append(f"{exp.description.lower()} {exp.merchant.lower()}")
                labels.append(exp.category)

    if not has_custom:
        return get_base_classifier()

    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
    X = vectorizer.fit_transform(texts)
    model = MultinomialNB()
    model.fit(X, labels)
    return vectorizer, model

@router.post("/natural-language-expense", response_model=NaturalLanguageExpenseResponse)
def parse_natural_language_expense(
    request: NaturalLanguageExpenseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    raw_text = request.text.strip()
    text = raw_text.lower()
    
    # 1. Amount Extraction
    amount: Optional[float] = None
    # Match patterns like: ₹500, Rs. 500, Rs 500, INR 500, $500, 500.50, spent 650, paid 1200
    amount_match = re.search(r'(?:₹|rs\.?|inr|\$)?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|\.[0-9]{1,2})\b', text)
    if amount_match:
        val_str = amount_match.group(1).replace(',', '')
        try:
            val = float(val_str)
            if val > 0:
                amount = val
        except ValueError:
            pass

    # 2. Date Extraction
    target_date = date.today()
    if "yesterday" in text:
        target_date = target_date - timedelta(days=1)
    elif "day before yesterday" in text:
        target_date = target_date - timedelta(days=2)
    else:
        # Check ISO format YYYY-MM-DD or DD-MM-YYYY
        date_match = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', text)
        if date_match:
            try:
                target_date = datetime.strptime(date_match.group(1), "%Y-%m-%d").date()
            except ValueError:
                pass
        else:
            dmy_match = re.search(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b', text)
            if dmy_match:
                d, m, y = dmy_match.groups()
                if len(y) == 2:
                    y = "20" + y
                try:
                    target_date = date(int(y), int(m), int(d))
                except ValueError:
                    pass

    # 3. Merchant Extraction
    merchant: Optional[str] = None
    merchant_match = re.search(r'\b(?:at|from|to|on)\s+([A-Za-z0-9\'\.\-]+(?:\s+[A-Za-z0-9\'\.\-]+)?)', raw_text, re.IGNORECASE)
    if merchant_match:
        candidate = merchant_match.group(1).strip()
        # filter common false positive prepositions/words
        if candidate.lower() not in ["dinner", "lunch", "breakfast", "groceries", "shopping", "clothes", "food", "movie", "yesterday", "today"]:
            merchant = candidate

    # 4. Category Prediction using ML
    user_expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    vectorizer, model = get_category_classifier(user_expenses)
    
    clean_text_for_cat = re.sub(r'(?:₹|rs\.?|inr|\$)?\s*[0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?', '', text)
    clean_text_for_cat = re.sub(r'\b(i|spent|paid|bought|yesterday|today|on|at|for)\b', '', clean_text_for_cat).strip()
    
    predicted_category = "Food" # Default fallback
    confidence = 0.85
    if clean_text_for_cat:
        try:
            X_input = vectorizer.transform([clean_text_for_cat])
            probs = model.predict_proba(X_input)[0]
            max_idx = np.argmax(probs)
            predicted_category = model.classes_[max_idx]
            confidence = round(float(probs[max_idx]), 2)
        except Exception:
            pass

    # 5. Clean Description
    description = raw_text

    return NaturalLanguageExpenseResponse(
        amount=amount or 0.0,
        category=predicted_category,
        date=target_date.strftime("%Y-%m-%d"),
        merchant=merchant,
        description=description,
        confidence=confidence
    )

@router.post("/categorize", response_model=CategorizeResponse)
def categorize_expense(
    request: CategorizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    vectorizer, model = get_category_classifier(user_expenses)

    try:
        X_input = vectorizer.transform([request.description.lower()])
        if X_input.nnz == 0:
            return CategorizeResponse(category="Other", confidence=0.0)
        probs = model.predict_proba(X_input)[0]
        max_idx = np.argmax(probs)
        cat = model.classes_[max_idx]
        conf = float(probs[max_idx])
        if conf < 0.25:
            return CategorizeResponse(category="Other", confidence=round(conf, 2))
        return CategorizeResponse(category=cat, confidence=round(conf, 2))
    except Exception:
        return CategorizeResponse(category="Other", confidence=0.0)

@router.post("/predict-expenses", response_model=PredictExpensesResponse)
def predict_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    if not expenses:
        return PredictExpensesResponse(
            predicted_amount=0.0,
            prediction_period="Next Month",
            factors=["No historical expense data recorded yet."]
        )

    # Group expenses by year-month
    df = pd.DataFrame([{
        "amount": e.amount,
        "date": e.expense_date,
        "category": e.category
    } for e in expenses])
    
    df['date'] = pd.to_datetime(df['date'])
    df['year_month'] = df['date'].dt.to_period('M')
    monthly_series = df.groupby('year_month')['amount'].sum().reset_index()
    monthly_series = monthly_series.sort_values('year_month')

    factors = []
    top_categories = df.groupby('category')['amount'].sum().nlargest(2).index.tolist()
    if top_categories:
        factors.append(f"Major spending drivers: {', '.join(top_categories)}")

    if len(monthly_series) >= 2:
        # Fit Linear Regression on time indices
        X = np.arange(len(monthly_series)).reshape(-1, 1)
        y = monthly_series['amount'].values
        reg = LinearRegression().fit(X, y)
        next_idx = np.array([[len(monthly_series)]])
        pred = float(reg.predict(next_idx)[0])
        pred = max(pred, float(monthly_series['amount'].mean() * 0.8)) # reasonable lower bound
        
        trend = "upward" if reg.coef_[0] > 0 else "downward"
        factors.append(f"Historical trend is {trend} based on {len(monthly_series)} months of data.")
    else:
        # If only 1 month or recent data, extrapolate current monthly run-rate
        current_spent = float(monthly_series['amount'].iloc[-1])
        pred = current_spent * 1.05 # modest buffer
        factors.append("Estimated based on current monthly pace and standard cost variability.")

    return PredictExpensesResponse(
        predicted_amount=round(pred, 2),
        prediction_period="Next Month",
        factors=factors
    )

@router.post("/detect-anomalies", response_model=AnomalyDetectionResponse)
def detect_anomalies(
    request: AnomalyDetectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    category_expenses = db.query(Expense.amount).filter(
        Expense.user_id == current_user.id,
        Expense.category == request.category
    ).all()

    amounts = [e[0] for e in category_expenses]
    
    if len(amounts) < 3:
        # Not enough category data, flag if absolute amount is high (> ₹5,000)
        is_anom = request.amount > 5000
        return AnomalyDetectionResponse(
            is_anomaly=is_anom,
            anomaly_score=0.85 if is_anom else 0.1,
            explanation=f"Expense of ₹{request.amount:,.2f} in {request.category} is unusually high for a new category." if is_anom else "Normal spending."
        )

    mean_val = np.mean(amounts)
    std_val = np.std(amounts)
    if std_val == 0:
        std_val = mean_val * 0.2

    z_score = (request.amount - mean_val) / std_val
    is_anomaly = bool(z_score > 2.0 and request.amount > (mean_val * 1.8))
    score = min(1.0, max(0.0, float(z_score / 4.0)))

    if is_anomaly:
        explanation = f"Your normal spending on '{request.category}' averages ₹{mean_val:,.2f}. This expense of ₹{request.amount:,.2f} is significantly higher than usual."
    else:
        explanation = f"Within your typical range for {request.category} (avg: ₹{mean_val:,.2f})."

    return AnomalyDetectionResponse(
        is_anomaly=is_anomaly,
        anomaly_score=round(score, 2),
        explanation=explanation
    )

@router.get("/insights", response_model=InsightResponse)
def get_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = datetime.now()
    curr_m = now.month
    curr_y = now.year

    # Last month
    prev_date = now - timedelta(days=32)
    prev_m = prev_date.month
    prev_y = prev_date.year

    insights = []

    # 1. Total expense comparison month-over-month
    curr_expense_total = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        extract('month', Expense.expense_date) == curr_m,
        extract('year', Expense.expense_date) == curr_y
    ).scalar() or 0.0

    prev_expense_total = db.query(func.sum(Expense.amount)).filter(
        Expense.user_id == current_user.id,
        extract('month', Expense.expense_date) == prev_m,
        extract('year', Expense.expense_date) == prev_y
    ).scalar() or 0.0

    if prev_expense_total > 0:
        diff_pct = ((curr_expense_total - prev_expense_total) / prev_expense_total) * 100
        if diff_pct > 0:
            insights.append(f"Your total spending increased by {diff_pct:.1f}% compared to last month.")
        elif diff_pct < 0:
            insights.append(f"Great job! Your spending decreased by {abs(diff_pct):.1f}% compared to last month.")
    elif curr_expense_total > 0:
        insights.append(f"You have spent ₹{curr_expense_total:,.2f} this month so far.")

    # 2. Highest spending category
    highest_cat = db.query(
        Expense.category, func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == current_user.id,
        extract('month', Expense.expense_date) == curr_m,
        extract('year', Expense.expense_date) == curr_y
    ).group_by(Expense.category).order_by(func.sum(Expense.amount).desc()).first()

    if highest_cat and curr_expense_total > 0:
        cat_name, cat_amount = highest_cat
        pct = (cat_amount / curr_expense_total) * 100
        insights.append(f"{cat_name} is your highest spending category this month, making up {pct:.1f}% (₹{cat_amount:,.2f}) of your total expenses.")

    # 3. Budget warnings
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == curr_m,
        Budget.year == curr_y
    ).all()

    for b in budgets:
        spent = db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == current_user.id,
            Expense.category == b.category_name,
            extract('month', Expense.expense_date) == curr_m,
            extract('year', Expense.expense_date) == curr_y
        ).scalar() or 0.0

        if b.amount > 0:
            pct_used = (spent / b.amount) * 100
            if pct_used >= 100:
                insights.append(f"⚠️ Budget Exceeded: You have spent ₹{spent:,.2f} on {b.category_name}, exceeding your ₹{b.amount:,.2f} budget!")
            elif pct_used >= 85:
                insights.append(f"⚠️ Budget Warning: You have used {pct_used:.0f}% of your {b.category_name} budget (₹{spent:,.2f} of ₹{b.amount:,.2f}).")

    # 4. Income and Savings rate
    curr_income_total = db.query(func.sum(Income.amount)).filter(
        Income.user_id == current_user.id,
        extract('month', Income.income_date) == curr_m,
        extract('year', Income.income_date) == curr_y
    ).scalar() or 0.0

    if curr_income_total > 0:
        savings = curr_income_total - curr_expense_total
        savings_pct = (savings / curr_income_total) * 100
        if savings_pct > 20:
            insights.append(f"🌟 Healthy Savings: You are currently saving {savings_pct:.1f}% of your monthly income (₹{savings:,.2f}).")
        elif savings_pct > 0:
            insights.append(f"💡 Savings Alert: Your savings rate is {savings_pct:.1f}%. Consider trimming discretionary categories to reach 20%+.")
        else:
            insights.append(f"🚨 Deficit Warning: Your expenses (₹{curr_expense_total:,.2f}) currently exceed your income (₹{curr_income_total:,.2f}) this month.")

    # Fallback if no data yet
    if not insights:
        insights = [
            "Start logging your daily expenses and income to unlock personalized financial insights.",
            "Set up monthly budgets for your frequent categories to monitor spending health."
        ]

    return InsightResponse(insights=insights)
