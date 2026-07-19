"""
Rendert die lokalisierten Bewerber-E-Mails als HTML-Dateien zum Ansehen im Browser.

Nutzung (im backend/-Verzeichnis, venv aktiv):
    python scripts/preview_emails.py [ZIELORDNER]

Standard-Zielordner: /tmp/email_previews
Es wird NICHTS versendet – nur HTML-Dateien geschrieben.
"""
import os
import sys
import logging

logging.disable(logging.CRITICAL)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.email_service import EmailService

OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp/email_previews"
os.makedirs(OUT, exist_ok=True)

LANGS = ["de", "en", "es", "ru"]

# Beispiel-Daten
NAME = "Anna Muster"
JOB = "Koch/Köchin"
COMPANY = "Hotel Alpenblick"

es = EmailService()

# send_email abfangen -> HTML in Datei schreiben statt versenden
captured = {}
def _capture(to_email, subject, html_content, **kwargs):
    captured["subject"] = subject
    captured["html"] = html_content
    return True
es.send_email = _capture  # type: ignore

# (Dateiname, Aufruf) je Sprache
def render(lang):
    cases = [
        ("welcome", lambda: es.send_welcome_email("x@y.de", NAME, "applicant", lang=lang)),
        ("application_received", lambda: es.send_application_received("x@y.de", NAME, JOB, COMPANY, lang=lang)),
        ("status_accepted", lambda: es.send_application_status_update("x@y.de", NAME, JOB, COMPANY, "accepted", lang=lang)),
        ("status_rejected", lambda: es.send_application_status_update("x@y.de", NAME, JOB, COMPANY, "rejected", lang=lang)),
        ("status_interview_scheduled", lambda: es.send_application_status_update("x@y.de", NAME, JOB, COMPANY, "interview_scheduled", lang=lang)),
    ]
    links = []
    for name, fn in cases:
        captured.clear()
        fn()
        fname = f"{lang}__{name}.html"
        with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
            f.write(f"<!-- Betreff: {captured.get('subject','')} -->\n")
            f.write(captured.get("html", ""))
        links.append((fname, captured.get("subject", "")))
    return links

index_rows = ""
for lang in LANGS:
    for fname, subject in render(lang):
        index_rows += f'<li><a href="{fname}">{fname}</a> — <em>{subject}</em></li>\n'

with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
    f.write(f"<html><body style='font-family:Arial'><h1>E-Mail-Vorschau (de/en/es/ru)</h1><ul>{index_rows}</ul></body></html>")

print(f"Fertig. Vorschau-Dateien in: {OUT}")
print(f"Öffnen:  open {os.path.join(OUT, 'index.html')}")
