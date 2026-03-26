"""
Sales/Vertrieb API - Kaltakquise E-Mail-Versand

Ermöglicht Admins:
- CSV mit E-Mail-Adressen hochzuladen
- Betreff und HTML-Inhalt zu definieren
- Massen-E-Mails für Kaltakquise zu versenden
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import csv
import io
import re
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models import User
from app.models.user import UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sales", tags=["sales"])


# === Pydantic Schemas ===

class EmailRecipient(BaseModel):
    email: str
    valid: bool = True
    error: Optional[str] = None


class ParseCSVResponse(BaseModel):
    total: int
    valid: int
    invalid: int
    recipients: List[EmailRecipient]


class SendSalesEmailRequest(BaseModel):
    recipients: List[str]  # Liste von E-Mail-Adressen
    subject: str
    html_content: str = ""  # HTML-Inhalt (optional wenn plain_text)
    plain_text: str = ""  # Volltext-Inhalt (optional wenn html_content)
    is_html: bool = True  # True = HTML, False = Volltext
    send_test_first: bool = False  # Erst Test-E-Mail an Admin senden


class SendSalesEmailResponse(BaseModel):
    success: bool
    total: int
    sent: int
    failed: int
    errors: List[dict]


# === Helper Functions ===

def validate_email(email: str) -> bool:
    """Validiert eine E-Mail-Adresse"""
    # Bereinige die E-Mail von unsichtbaren Zeichen
    cleaned = email.strip().replace('\r', '').replace('\n', '').replace('\t', '')
    # Erlaube alle gängigen E-Mail-Formate inkl. Zahlen, Punkte, Bindestriche
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
    result = bool(re.match(pattern, cleaned))
    if not result:
        logger.warning(f"E-Mail-Validierung fehlgeschlagen für: '{cleaned}' (original: '{email}')")
    return result


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Stellt sicher, dass der Benutzer Admin ist"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur Admins haben Zugriff auf Vertriebsfunktionen")
    return current_user


# === API Endpoints ===

@router.post("/parse-csv", response_model=ParseCSVResponse)
async def parse_email_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin)
):
    """
    Parst eine CSV-Datei mit E-Mail-Adressen.
    Erwartet eine E-Mail pro Zeile oder CSV mit E-Mail-Spalte.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Nur CSV-Dateien sind erlaubt")
    
    content = await file.read()
    
    try:
        # Versuche verschiedene Encodings
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                text = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise HTTPException(status_code=400, detail="Datei-Encoding nicht erkannt")
        
        # Entferne BOM (Byte Order Mark) falls vorhanden
        if text.startswith('\ufeff'):
            text = text[1:]
        
        recipients = []
        seen_emails = set()
        
        # Versuche als CSV zu parsen
        lines = text.strip().split('\n')
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Versuche Komma-getrennte Werte
            parts = line.split(',')
            
            for part in parts:
                # Bereinige gründlich von allen unsichtbaren Zeichen
                part = part.strip().strip('"').strip("'").strip()
                part = part.replace('\r', '').replace('\n', '').replace('\t', '').replace(' ', '')
                part = part.lower()
                
                # Überspringe Header-Zeilen
                if part in ['email', 'e-mail', 'mail', 'emailaddress', 'email_address']:
                    continue
                
                if not part or part in seen_emails:
                    continue
                
                seen_emails.add(part)
                
                if validate_email(part):
                    recipients.append(EmailRecipient(email=part, valid=True))
                    logger.info(f"Gültige E-Mail gefunden: {part}")
                else:
                    recipients.append(EmailRecipient(
                        email=part, 
                        valid=False, 
                        error="Ungültiges E-Mail-Format"
                    ))
        
        valid_count = sum(1 for r in recipients if r.valid)
        invalid_count = len(recipients) - valid_count
        
        return ParseCSVResponse(
            total=len(recipients),
            valid=valid_count,
            invalid=invalid_count,
            recipients=recipients
        )
        
    except Exception as e:
        logger.error(f"CSV-Parsing-Fehler: {e}")
        raise HTTPException(status_code=400, detail=f"Fehler beim Parsen der CSV: {str(e)}")


@router.post("/send", response_model=SendSalesEmailResponse)
async def send_sales_emails(
    data: SendSalesEmailRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Sendet Kaltakquise-E-Mails an die angegebenen Empfänger.
    Verwendet business@jobon.work als Absender.
    """
    from app.services.email_service import email_service
    
    if not data.recipients:
        raise HTTPException(status_code=400, detail="Keine Empfänger angegeben")
    
    # Prüfe ob Inhalt vorhanden (entweder HTML oder Volltext)
    content = data.html_content if data.is_html else data.plain_text
    if not data.subject or not content:
        raise HTTPException(status_code=400, detail="Betreff und Inhalt sind erforderlich")
    
    # Validiere alle E-Mails
    valid_recipients = [email for email in data.recipients if validate_email(email)]
    
    if not valid_recipients:
        raise HTTPException(status_code=400, detail="Keine gültigen E-Mail-Adressen")
    
    # Test-E-Mail an Admin senden
    if data.send_test_first:
        test_success = email_service.send_sales_email(
            to_email=current_user.email,
            subject=f"[TEST] {data.subject}",
            html_content=content,
            is_html=data.is_html
        )
        if not test_success:
            raise HTTPException(status_code=500, detail="Test-E-Mail konnte nicht gesendet werden")
        
        return SendSalesEmailResponse(
            success=True,
            total=1,
            sent=1,
            failed=0,
            errors=[]
        )
    
    # Massen-Versand
    sent = 0
    failed = 0
    errors = []
    
    for email in valid_recipients:
        try:
            success = email_service.send_sales_email(
                to_email=email,
                subject=data.subject,
                html_content=content,
                is_html=data.is_html
            )
            if success:
                sent += 1
                logger.info(f"Sales-E-Mail gesendet an: {email}")
            else:
                failed += 1
                errors.append({"email": email, "error": "Versand fehlgeschlagen"})
        except Exception as e:
            failed += 1
            errors.append({"email": email, "error": str(e)})
            logger.error(f"Fehler beim Senden an {email}: {e}")
    
    return SendSalesEmailResponse(
        success=failed == 0,
        total=len(valid_recipients),
        sent=sent,
        failed=failed,
        errors=errors
    )


@router.post("/send-test")
async def send_test_email(
    data: SendSalesEmailRequest,
    current_user: User = Depends(require_admin)
):
    """Sendet eine Test-E-Mail an den aktuellen Admin"""
    from app.services.email_service import email_service
    
    # Bestimme den Inhalt basierend auf dem Modus
    content = data.html_content if data.is_html else data.plain_text
    
    if not data.subject or not content:
        raise HTTPException(status_code=400, detail="Betreff und Inhalt sind erforderlich")
    
    logger.info(f"Sende Test-E-Mail an {current_user.email}, is_html={data.is_html}")
    
    success = email_service.send_sales_email(
        to_email=current_user.email,
        subject=f"[TEST] {data.subject}",
        html_content=content,
        is_html=data.is_html
    )
    
    if success:
        return {"success": True, "message": f"Test-E-Mail an {current_user.email} gesendet"}
    else:
        raise HTTPException(status_code=500, detail="Test-E-Mail konnte nicht gesendet werden")
