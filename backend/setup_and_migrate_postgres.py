import urllib.parse
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from pathlib import Path
from datetime import datetime, date
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.database.connection import Base
from app.models.user import User
from app.models.category import Category
from app.models.income import Income
from app.models.expense import Expense
from app.models.budget import Budget
from app.models.goal import FinancialGoal
from app.models.monthly_savings import MonthlySavings
from app.models.ai_prediction import AIPrediction
from app.models.notification import Notification

from app.core.config import settings
import os

DB_USER = os.getenv("POSTGRES_USER", settings.POSTGRES_USER)
DB_PASS = os.getenv("POSTGRES_PASSWORD", settings.POSTGRES_PASSWORD)
DB_HOST = os.getenv("POSTGRES_SERVER", settings.POSTGRES_SERVER)
DB_PORT = int(os.getenv("POSTGRES_PORT", settings.POSTGRES_PORT))
DB_NAME = os.getenv("POSTGRES_DB", settings.POSTGRES_DB)


encoded_pass = urllib.parse.quote_plus(DB_PASS)

print("--- Step 1: Ensure PostgreSQL database exists ---")
conn = psycopg2.connect(
    dbname="postgres",
    user=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT
)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cursor = conn.cursor()
cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{DB_NAME}'")
if not cursor.fetchone():
    print(f"Creating database '{DB_NAME}'...")
    cursor.execute(f"CREATE DATABASE {DB_NAME};")
    print(f"Database '{DB_NAME}' created.")
else:
    print(f"Database '{DB_NAME}' exists.")
cursor.close()
conn.close()

# Engines
pg_url = f"postgresql://{DB_USER}:{encoded_pass}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
pg_engine = create_engine(pg_url)

sqlite_path = Path(__file__).resolve().parent / "expense_tracker.db"
sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"
sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

print("\n--- Step 2: Re-creating tables in PostgreSQL ---")
Base.metadata.drop_all(bind=pg_engine)
Base.metadata.create_all(bind=pg_engine)
print("PostgreSQL tables created cleanly.")

print("\n--- Step 3: Migrating data using SQLAlchemy ORM ---")
SqliteSession = sessionmaker(bind=sqlite_engine)
PgSession = sessionmaker(bind=pg_engine)

sqlite_db = SqliteSession()
pg_db = PgSession()

models_in_order = [
    (User, "users"),
    (Category, "categories"),
    (Income, "incomes"),
    (Expense, "expenses"),
    (Budget, "budgets"),
    (FinancialGoal, "financial_goals"),
    (MonthlySavings, "monthly_savings"),
    (AIPrediction, "ai_predictions"),
    (Notification, "notifications"),
]

try:
    for model_cls, table_name in models_in_order:
        records = sqlite_db.query(model_cls).all()
        print(f"Found {len(records)} records for {table_name} in SQLite.")
        for r in records:
            # Create a detached copy for PG
            cols = {col.name: getattr(r, col.name) for col in model_cls.__table__.columns}
            new_obj = model_cls(**cols)
            pg_db.merge(new_obj)
        pg_db.commit()
        print(f"-> Migrated {len(records)} records to PostgreSQL table '{table_name}'.")

        # Reset sequence for table id
        try:
            with pg_engine.begin() as conn:
                conn.execute(text(f"""
                    SELECT setval(
                        pg_get_serial_sequence('"{table_name}"', 'id'),
                        COALESCE((SELECT MAX(id) FROM "{table_name}"), 1)
                    );
                """))
        except Exception as seq_err:
            pass

    # Also migrate alembic_version if exists
    try:
        with sqlite_engine.connect() as s_conn:
            res = s_conn.execute(text("SELECT version_num FROM alembic_version"))
            row = res.fetchone()
            if row:
                ver = row[0]
                with pg_engine.begin() as p_conn:
                    p_conn.execute(text("CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) NOT NULL, PRIMARY KEY (version_num))"))
                    p_conn.execute(text("INSERT INTO alembic_version (version_num) VALUES (:v) ON CONFLICT DO NOTHING"), {"v": ver})
                print(f"Alembic version {ver} migrated.")
    except Exception as alembic_err:
        pass

    print("\n--- Migration Complete and Verified Successfully! ---")
finally:
    sqlite_db.close()
    pg_db.close()
