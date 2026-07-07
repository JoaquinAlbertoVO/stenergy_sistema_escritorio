import requests

api_url = "https://stenergy-certs-api-96e3.onrender.com/api/sales"

print("Fetching sales...")
r = requests.get(api_url)
if r.status_code != 200:
    print(f"Error fetching sales: {r.status_code}")
    exit(1)
    
sales = r.json()
updates_count = 0

for sale in sales:
    changed = False
    for payment in sale.get('payments', []):
        if payment.get('account') == "YAPE Mariela":
            payment['account'] = "YAPE MARIELA"
            changed = True
            
    if changed:
        print(f"Updating sale {sale['id']}...")
        res = requests.put(f"{api_url}/{sale['id']}", json=sale)
        if res.status_code in [200, 201, 204]:
            updates_count += 1
        else:
            print(f"Failed to update sale {sale['id']}: {res.status_code} - {res.text}")

print(f"Finished! Successfully updated {updates_count} sales with 'YAPE Mariela'.")
