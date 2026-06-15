import sqlite3
import os

db_path = 'stenergy.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM sales")
        print(f"Total sales in {db_path}: {c.fetchone()[0]}")
    except Exception as e:
        print(e)
    conn.close()
else:
    print(f"{db_path} does not exist.")
