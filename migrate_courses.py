import requests, json, re

mapping_rules = {
    'TER TER': ['terminacion', 'termocontraible'],
    'TER TER VIR': ['terminacion', 'termocontraible', 'virtual'],
    'EMP TER': ['empalme', 'termocontraible'],
    'EMP TER VIR': ['empalme', 'termocontraible', 'virtual'],
    'ANA': ['analizador'],
    'ANA VIR': ['analizador', 'virtual'],
    'MSE': ['mantenimiento', 'subestacion'],
    'MSE VIR': ['mantenimiento', 'subestacion', 'virtual'],
    'PRO': ['proteccion'],
    'TER AUT': ['terminacion', 'autocontraible'],
    'EMP AUT': ['empalme', 'autocontraible'],
    'CTC': ['conduit'],
    'CTC VIR': ['conduit', 'virtual'],
    'BDC': ['condensadores'],
    'BDC VIR': ['condensadores', 'virtual'],
    'ADF': ['facturacion'],
    'ADF VIR': ['facturacion', 'virtual'],
    'DDC': ['cables'],
    'DDC VIR': ['cables', 'virtual'],
    'EMT': ['expediente'],
    'EMT VIRUTAL': ['expediente', 'virtual'],
    'VAR VIR': ['variador', 'virtual'],
    # extras
    'TER VIR': ['terminacion', 'virtual'],
    'EMP': ['empalme'],
    'TER': ['terminacion'],
    'EMP TER TER': ['empalme', 'termocontraible'],
    'MSE - VIR': ['mantenimiento', 'subestacion', 'virtual'],
    'BDC - VIR': ['condensadores', 'virtual'],
    'CTC VIRTUAL': ['conduit', 'virtual'],
    'EEI VIR': ['electricidad', 'industrial', 'virtual'],
    'EEI - VIR': ['electricidad', 'industrial', 'virtual']
}

def extract_month(date_str):
    if not date_str: return ''
    return date_str[:7] # YYYY-MM

def match_course(sale, courses):
    abbr = sale.get('courseName', '').strip().upper()
    if abbr not in mapping_rules:
        return None
        
    keywords = mapping_rules[abbr]
    sale_date = sale.get('date', '')
    sale_month = extract_month(sale_date) # YYYY-MM
    
    best_match = None
    best_score = -1
    
    for c in courses:
        cname = c['name'].lower()
        
        # Base text match score
        score = 0
        all_keywords_found = True
        
        # check core topics (ignore 'virtual' for the strict check)
        core_keywords = [kw for kw in keywords if kw != 'virtual']
        
        for kw in core_keywords:
            if kw in cname:
                score += 20
            else:
                all_keywords_found = False
                
        if not all_keywords_found and len(core_keywords) > 0:
            continue # MUST match all core keywords
            
        # If the keywords specifically say 'virtual', reward it
        is_virtual_rule = 'virtual' in keywords
        is_virtual_course = 'virtual' in cname
        
        if is_virtual_rule and is_virtual_course:
            score += 15
        elif is_virtual_rule and not is_virtual_course:
            score -= 5
        elif not is_virtual_rule and is_virtual_course:
            score -= 5
            
        # Date score
        c_date_match = re.search(r'(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})', cname)
        if c_date_match:
            month = c_date_match.group(2).zfill(2)
            year = c_date_match.group(3)
            if len(year) == 2: year = '20' + year
            course_month = f'{year}-{month}'
            
            if course_month == sale_month:
                score += 30
                
        if score > best_score and score > 0:
            best_score = score
            best_match = c
            
    return best_match

print("Fetching data...")
r1 = requests.get('https://stenergy-certs-api-96e3.onrender.com/api/sales')
sales = r1.json()

r2 = requests.get('https://stenergy-certs-api-96e3.onrender.com/api/courses')
courses = r2.json()

matched_pairs = {}
matched_count = 0
unmatched_count = 0

updates = []

full_name_mapping = {
    'TER TER': 'TERMINACIÓN TERMOCONTRAIBLE',
    'TER TER VIR': 'TERMINACIÓN TERMOCONTRAIBLE VIRTUAL',
    'EMP TER': 'EMPALME TERMOCONTRAIBLE',
    'EMP TER VIR': 'EMPALME TERMOCONTRAIBLE VIRTUAL',
    'ANA': 'ANALIZADOR DE REDES',
    'ANA VIR': 'ANALIZADOR DE REDES VIRTUAL',
    'MSE': 'MANTENIMIENTO DE SUBESTACION',
    'MSE VIR': 'MANTENIMIENTO DE SUBESTACION VIRTUAL',
    'PRO': 'PROTECCIONES SISTEMAS',
    'TER AUT': 'TERMINACION AUTOCONTRAIBLE',
    'EMP AUT': 'EMPALME AUTOCONTRAIBLE',
    'CTC': 'CANALIZACION TUBERIA CONDUIT',
    'CTC VIR': 'CANALIZACION TUBERIA CONDUIT VIR',
    'BDC': 'BANCO DE CONDENSADORES',
    'BDC VIR': 'BANCO DE CONDENSADORES VIRTUAL',
    'ADF': 'ANALISIS DE FACTURACIÓN',
    'ADF VIR': 'ANALISIS DE FACTURACIÓN VIRTUAL',
    'DDC': 'DETECTOR DE CABLES',
    'DDC VIR': 'DETECTOR DE CABLES VIR',
    'EMT': 'EXPEDIENTE MT',
    'EMT VIRUTAL': 'EXPEDIENTE MT VIRUTAL',
    'VAR VIR': 'VARIADORES VIRTUAL',
    'TER VIR': 'TERMINACIÓN TERMOCONTRAIBLE VIRTUAL',
    'EMP': 'EMPALME TERMOCONTRAIBLE',
    'TER': 'TERMINACIÓN TERMOCONTRAIBLE',
    'EMP TER TER': 'EMPALME TERMOCONTRAIBLE',
    'MSE - VIR': 'MANTENIMIENTO DE SUBESTACION VIRTUAL',
    'BDC - VIR': 'BANCO DE CONDENSADORES VIRTUAL',
    'CTC VIRTUAL': 'CANALIZACION TUBERIA CONDUIT VIR',
    'EEI VIR': 'ELECTRICIDAD INDUSTRIAL VIRTUAL',
    'EEI - VIR': 'ELECTRICIDAD INDUSTRIAL VIRTUAL'
}

for s in sales:
    abbr = s.get('courseName', '').strip().upper()
    if abbr in mapping_rules:
        match = match_course(s, courses)
        key = f"{abbr} ({extract_month(s.get('date', ''))})"
        if match:
            if key not in matched_pairs:
                matched_pairs[key] = match['name']
            matched_count += 1
            updates.append({
                "saleId": s['id'],
                "courseId": match['id'],
                "courseName": match['name']
            })
        else:
            if key not in matched_pairs:
                matched_pairs[key] = "--- NO WORDPRESS COURSE FOUND ---"
            unmatched_count += 1
            
            # fallback update
            s_date = s.get('date', '')
            if s_date:
                parts = s_date.split('-')
                if len(parts) == 3:
                    y = parts[0][2:]
                    m = parts[1]
                    fallback_name = f"{full_name_mapping[abbr]} - 01/{m}/{y}"
                else:
                    fallback_name = full_name_mapping[abbr]
            else:
                fallback_name = full_name_mapping[abbr]
                
            updates.append({
                "saleId": s['id'],
                "courseId": s.get('courseId'), # Keep old
                "courseName": fallback_name
            })

print('--- MAPPING PREVIEW ---')
for k, v in matched_pairs.items():
    print(f'{k}  =>  {v}')
print('---')
print(f"Total sales mapped successfully to WP course: {matched_count}")
print(f"Total sales with no matching WP course (using fallback name): {unmatched_count}")

with open('updates.json', 'w') as f:
    json.dump(updates, f, indent=2)
