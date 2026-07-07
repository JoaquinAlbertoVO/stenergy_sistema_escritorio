import requests
import json

api_url = "https://stenergy-certs-api-96e3.onrender.com/api/courses"

courses = [
    {
        'id': '3534',
        'name': 'Curso Práctico de Terminaciones en Media Tensión -17/06/26',
        'shortName': 'Terminaciones MT',
        'courseCode': '',
        'price': 350.0,
        'color': '#ff6b35',
        'icon': '⚡',
        'academicHours': '120 horas',
        'descriptionText': 'Participó y aprobó satisfactoriamente el curso práctico de Terminaciones en Media Tensión.',
        'cpanelFolder': ''
    },
    {
        'id': '3229',
        'name': 'Curso Especialización en Electricidad Industrial -Virtual-01/06/26',
        'shortName': 'Electricidad Ind.',
        'courseCode': '',
        'price': 400.0,
        'color': '#00d4aa',
        'icon': '🔧',
        'academicHours': '120 horas',
        'descriptionText': 'Participó y aprobó satisfactoriamente el curso de especialización en Electricidad Industrial.',
        'cpanelFolder': ''
    },
    {
        'id': '3492',
        'name': 'Curso Práctico de Analizador de Redes – Semipresencial – 15/06/26',
        'shortName': 'Analizador Redes',
        'courseCode': '',
        'price': 380.0,
        'color': '#7c5cfc',
        'icon': '📊',
        'academicHours': '120 horas',
        'descriptionText': 'Participó y aprobó satisfactoriamente el curso práctico de Analizador de Redes.',
        'cpanelFolder': ''
    }
]

for course in courses:
    try:
        response = requests.post(api_url, json=course, timeout=10)
        print(f"POST {course['name']} -> Status: {response.status_code}")
        if response.status_code >= 400:
            print("Response:", response.text)
    except Exception as e:
        print(f"Failed to post {course['name']}: {e}")
