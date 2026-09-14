# Expense Tracker - Backend

This is the FastAPI backend for the Expense Tracker.

## Prerequisites
- Python 3.12+
- Docker & Docker Compose (for the PostgreSQL database)

## Setup & Running

### 1. Start the Database
From the root of the project (where `docker-compose.yml` is located), run:
```bash
docker-compose up -d
```
This starts PostgreSQL on port `5433`.

### 2. Activate the Virtual Environment
Navigate to the `backend` folder and activate the environment:
```powershell
cd backend
.\venv\Scripts\activate
```

### 3. Run Database Migrations
Run Alembic to create the database tables:
```bash
alembic upgrade head
```
*(Note: If you change models, run `alembic revision --autogenerate -m "Message"` to generate a new migration before upgrading).*

### 4. Start the FastAPI Server
Start the development server with live reload:
```bash
uvicorn app.main:app --reload
```

The API will be available at: [http://127.0.0.1:8000](http://127.0.0.1:8000)
Interactive Swagger Documentation: [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs)
