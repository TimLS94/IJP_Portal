#!/usr/bin/env python3
"""
Script zum Erstellen der Performance-Indizes.
Ausführen in der Render Shell: python scripts/add_indexes.py
"""
from sqlalchemy import text
from app.core.database import engine

indexes = [
    "CREATE INDEX IF NOT EXISTS ix_applications_applicant_id ON applications(applicant_id)",
    "CREATE INDEX IF NOT EXISTS ix_applications_job_posting_id ON applications(job_posting_id)",
    "CREATE INDEX IF NOT EXISTS ix_applications_applied_at ON applications(applied_at DESC)",
    "CREATE INDEX IF NOT EXISTS ix_applications_is_filtered ON applications(is_filtered)",
    "CREATE INDEX IF NOT EXISTS ix_application_documents_application_id ON application_documents(application_id)",
    "CREATE INDEX IF NOT EXISTS ix_application_documents_document_id ON application_documents(document_id)",
    "CREATE INDEX IF NOT EXISTS ix_applications_job_posting_filtered ON applications(job_posting_id, is_filtered)",
]

if __name__ == "__main__":
    print("Creating performance indexes...")
    with engine.connect() as conn:
        for idx_sql in indexes:
            idx_name = idx_sql.split("IF NOT EXISTS ")[1].split(" ON")[0]
            try:
                conn.execute(text(idx_sql))
                conn.commit()
                print(f"  ✓ {idx_name}")
            except Exception as e:
                print(f"  ✗ {idx_name}: {e}")
    print("Done!")
