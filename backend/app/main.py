from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
import time
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

# GZip response compression for responses >= 1000 bytes (70-80% smaller payloads)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
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
    return {"message": "Welcome to Expense Tracker API", "status": "online"}

@app.get("/health")
@app.get("/api/health")
def health_check():
    """Ultra-fast, non-blocking health check endpoint for keep-alive pingers."""
    return {
        "status": "healthy",
        "service": "expense-tracker-api",
        "timestamp": int(time.time())
    }

