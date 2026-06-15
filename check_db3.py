import sqlite3

conn = sqlite3.connect('backend/stenergy.db')
c = conn.cursor()

c.execute("SELECT * FROM sales")
sales = c.fetchall()
print(f"Total sales: {len(sales)}")

# We need to update sales that have a specific payment. Wait, payment info is in payments table!
c.execute("SELECT * FROM payments")
payments = c.fetchall()
print(f"Total payments: {len(payments)}")

conn.close()
