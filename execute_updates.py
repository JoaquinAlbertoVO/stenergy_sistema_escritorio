import requests, json

api_url = "https://stenergy-certs-api-96e3.onrender.com/api/sales"

with open("updates.json", "r") as f:
    updates = json.load(f)

# we need to fetch the current sales first, to do a full replace or just partial?
# Let's assume PUT replaces the object, or the API merges. 
# It's safer to get the sale, modify courseId and courseName, and PUT back.

r = requests.get(api_url)
sales = r.json()
sales_dict = { s['id']: s for s in sales }

print(f"Applying {len(updates)} updates...")

success = 0
for u in updates:
    sale_id = u['saleId']
    if sale_id not in sales_dict:
        print(f"Sale {sale_id} not found!")
        continue
        
    sale = sales_dict[sale_id]
    
    # modify
    old_cname = sale.get('courseName')
    
    if u['courseId'] is not None:
        sale['courseId'] = str(u['courseId'])
    sale['courseName'] = str(u['courseName'])
    
    # PUT
    res = requests.put(f"{api_url}/{sale_id}", json=sale)
    if res.status_code in [200, 201, 204]:
        success += 1
    else:
        print(f"Failed to update {sale_id}: {res.status_code} - {res.text}")
        
print(f"Finished! Successfully updated {success} out of {len(updates)} sales.")
