#!/usr/bin/env python3
"""
Test script for email digest with REAL jobs from API
Run with: python test_email_digest.py
"""
import requests
from app.services.email_service import email_service

# Echte Jobs von der Render API laden
API_URL = "https://ijp-portal.onrender.com/api/v1/jobs?limit=5"

print("Loading real jobs from API...")
response = requests.get(API_URL)
jobs_data = response.json()
jobs_list = jobs_data if isinstance(jobs_data, list) else jobs_data.get('jobs', [])

# Job-Objekte erstellen
class JobWrapper:
    def __init__(self, data):
        self.id = data['id']
        self.title = data['title']
        self.slug = data['slug']
        self.location = data.get('location', 'Germany')
        self.company = type('Company', (), {'company_name': data.get('company_name', 'Unknown')})()

matching_jobs = []
for i, job_data in enumerate(jobs_list[:5]):
    score = 85 - (i * 5)  # 85, 80, 75, 70, 65
    matching_jobs.append({
        'job': JobWrapper(job_data),
        'score': score
    })
    print(f"  {score}% - {job_data['title'][:50]}")

if __name__ == "__main__":
    print(f'\nSending email with {len(matching_jobs)} REAL jobs to tim.schaefer94@web.de...')
    result = email_service.send_weekly_job_digest(
        to_email='tim.schaefer94@web.de',
        applicant_name='Tim Schäfer',
        matching_jobs=matching_jobs
    )
    print(f'Result: {result}')
