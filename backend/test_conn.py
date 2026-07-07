import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import sys

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    print(f"Connecting to: {db_url}")
    engine = create_engine(db_url)
    with engine.connect() as conn:
        print("Connection successful!")
        result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result]
        print("Tables in public schema:", tables)
        
        if 'sales' in tables:
            res = conn.execute(text("SELECT COUNT(*) FROM sales"))
            print("Sales count:", res.scalar())
        if 'courses' in tables:
            res = conn.execute(text("SELECT COUNT(*) FROM courses"))
            print("Courses count:", res.scalar())
except Exception as e:
    print("Error connecting to database:")
    print(e)
