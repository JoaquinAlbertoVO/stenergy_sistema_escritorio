import sqlite3
import json

conn = sqlite3.connect('backend/stenergy.db')
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)

if ('sales',) in tables:
    c.execute("PRAGMA table_info(sales)")
    print("Sales Schema:", c.fetchall())
    
    # We need to know if payments are stored as JSON in a column, or what
    # Let's see some sales
    c.execute("SELECT id, payments FROM sales LIMIT 5")
    print("Some sales:", c.fetchall())

conn.close()
