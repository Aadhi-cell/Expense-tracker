from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api import auth
from app.api import expenses
from app.api import income
from app.api import budgets
from app.api import goals
from app.api import dashboard
from app.api import ai

from app.database.connection import engine, Base
import app.models  # Ensure all models are registered

# Create database tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)


# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(income.router, prefix="/api/income", tags=["income"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["expenses"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(goals.router, prefix="/api/goals", tags=["goals"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])


@app.get("/")
def root():
    return {"message": "Welcome to Expense Tracker API"}

