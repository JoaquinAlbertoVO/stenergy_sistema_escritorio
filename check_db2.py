import sqlite3
import json

conn = sqlite3.connect('backend/stenergy.db')
c = conn.cursor()

c.execute("PRAGMA table_info(payments)")
print("Payments Schema:", c.fetchall())

c.execute("SELECT id, saleId, account, amount FROM payments")
all_payments = c.fetchall()
print("All payments:")
for p in all_payments:
    print(p)

conn.close()
