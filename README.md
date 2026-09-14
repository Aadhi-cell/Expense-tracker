# Expense Tracker - Personal Finance & Budgeting

A modern, full-stack personal finance and expense tracking application built with **React (Vite + TailwindCSS)**, **FastAPI (Python)**, and **PostgreSQL**.

---

## 🌟 Key Features

- **📊 Comprehensive Dashboard:** Real-time summary of monthly income, total expenses, available cash balance, and monthly savings allocations.
- **💰 Income Management:** Track multiple income streams (Salary, Business, Freelance, Bonus, Other) with payment methods (Bank Transfer, UPI, Cash, Cheque, Other) and recurring monthly flags.
- **💳 Expense Tracking:** Log and categorize expenses with payment methods, merchant details, notes, and interactive category breakdowns.
- **⚡ Quick Expense Entry:** Fast text parser allowing you to type or paste expenses naturally.
- **🎯 Budgets & Financial Goals:** Set monthly budgets by category with visual progress bars and create financial milestone goals with target dates.
- **📈 Financial Analytics & Insights:** Dynamic statistical analysis, spending alerts, anomaly scanner, and monthly trend forecasting.
- **📱 Responsive & Mobile-Optimized:** Clean layout with desktop sidebar, table views, and responsive mobile card feeds with bottom navigation.
- **🔐 Secure Authentication:** JWT-based user authentication with hashed passwords.

---

## 🛠️ Tech Stack

### Frontend
- **React 19** + **Vite**
- **TailwindCSS**
- **Lucide Icons**
- **Axios** & **React Router**

### Backend
- **FastAPI** (Python 3.12)
- **SQLAlchemy** & **Alembic**
- **PostgreSQL 18** (or Dockerized PostgreSQL)
- **Pydantic v2** & **python-jose** (JWT)

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.12+
- Node.js 18+ & npm
- PostgreSQL running locally or via Docker

---

### 1. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt   # or pip install fastapi uvicorn sqlalchemy psycopg2-binary pydantic-settings python-jose[cryptography] passlib[bcrypt] python-multipart python-dateutil scikit-learn numpy
   ```

4. Configure environment variables:
   Copy `.env.example` to `.env` and set your PostgreSQL credentials:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=yourpassword
   POSTGRES_SERVER=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=expense_tracker

   SECRET_KEY=your_secret_key_here
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ```

5. Run database migrations:
   ```bash
   python setup_and_migrate_postgres.py
   ```

6. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The API will run at `http://127.0.0.1:8000` (Swagger docs at `http://127.0.0.1:8000/api/docs`).

---

### 2. Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 📄 License
This project is open source and available under the [MIT License](LICENSE).
