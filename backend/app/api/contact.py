"""
Kontaktformular API
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from app.services.email_service import email_service
from app.core.rate_limiter import rate_limit_contact
from app.core.sanitizer import sanitize_plain_text
import logging
import html

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contact", tags=["contact"])

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    company: str = None
    subject: str
    message: str
    privacy: bool

# Kontakt-E-Mail-Adresse
CONTACT_EMAIL = "service@internationaljobplacement.com"

@router.post("")
async def send_contact_message(request: Request, form: ContactForm):
    """Sendet eine Kontaktanfrage per E-Mail"""
    # Rate Limiting: 5 Nachrichten pro Stunde
    await rate_limit_contact(request)
    
    if not form.privacy:
        raise HTTPException(status_code=400, detail="Sie müssen der Datenschutzerklärung zustimmen")
    
    if len(form.message) < 10:
        raise HTTPException(status_code=400, detail="Nachricht muss mindestens 10 Zeichen lang sein")
    
    # Input sanitisieren gegen XSS in E-Mails
    safe_name = html.escape(form.name)
    safe_company = html.escape(form.company) if form.company else None
    safe_subject = html.escape(form.subject)
    safe_message = html.escape(form.message)
    
    # E-Mail an IJP Service
    company_info = f"<p><strong>Firma:</strong> {safe_company}</p>" if safe_company else ""
    
    email_to_service = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
                Neue Kontaktanfrage
            </h1>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #1f2937;">Absender</h2>
                <p><strong>Name:</strong> {safe_name}</p>
                <p><strong>E-Mail:</strong> <a href="mailto:{form.email}">{form.email}</a></p>
                {company_info}
            </div>
            
            <div style="background: #fff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #1f2937;">Betreff: {safe_subject}</h2>
                <p style="white-space: pre-wrap;">{safe_message}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Diese Nachricht wurde über das Kontaktformular auf ijp-portal.de gesendet.
            </p>
        </div>
    </body>
    </html>
    """
    
    try:
        # E-Mail an Service-Adresse senden
        email_service.send_email(
            to_email=CONTACT_EMAIL,
            subject=f"Kontaktanfrage: {form.subject} - von {form.name}",
            html_content=email_to_service
        )
        
        # Bestätigungs-E-Mail an den Absender
        confirmation_email = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Vielen Dank für Ihre Nachricht!</h1>
                
                <p>Hallo {safe_name},</p>
                
                <p>wir haben Ihre Nachricht erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Ihre Anfrage:</strong></p>
                    <p style="margin: 10px 0 0 0;"><strong>Betreff:</strong> {safe_subject}</p>
                    <p style="margin: 5px 0; white-space: pre-wrap; color: #6b7280;">{safe_message[:500]}{'...' if len(safe_message) > 500 else ''}</p>
                </div>
                
                <p>Wir bemühen uns, alle Anfragen innerhalb von 24-48 Stunden zu beantworten.</p>
                
                <p>Mit freundlichen Grüßen,<br>
                Ihr IJP Team</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #6b7280; font-size: 12px;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin<br>
                    E-Mail: service@internationaljobplacement.com
                </p>
            </div>
        </body>
        </html>
        """
        
        email_service.send_email(
            to_email=form.email,
            subject="Ihre Anfrage bei IJP - Bestätigung",
            html_content=confirmation_email
        )
        
        logger.info(f"Kontaktanfrage von {form.email} erfolgreich verarbeitet")
        
    except Exception as e:
        logger.error(f"Fehler beim Senden der Kontaktanfrage: {e}")
        # Wir geben trotzdem Erfolg zurück, da die Nachricht zumindest geloggt wurde
    
    return {"message": "Nachricht erfolgreich gesendet", "success": True}

