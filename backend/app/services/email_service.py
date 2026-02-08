"""
E-Mail Service mit SendGrid HTTP API - CRASH-SAFE
"""
import logging
from typing import Optional, List

logger = logging.getLogger(__name__)


def _safe_email_call(func):
    """Decorator der ALLE E-Mail-Fehler abfängt - App darf NIEMALS crashen!"""
    import asyncio
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"E-Mail-Fehler (ignoriert): {type(e).__name__}: {str(e)}")
            return True  # Immer True zurückgeben, damit App weiterläuft
    
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"E-Mail-Fehler (ignoriert): {type(e).__name__}: {str(e)}")
            return True  # Immer True zurückgeben, damit App weiterläuft
    
    # Prüfen ob die Funktion async ist
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return wrapper


class EmailService:
    """Service zum Versenden von E-Mails über SendGrid HTTP API - CRASH-SAFE"""
    
    def __init__(self):
        try:
            from app.core.config import settings
            # SendGrid API Key (wird über SMTP_PASSWORD gesetzt)
            self.api_key = getattr(settings, 'SMTP_PASSWORD', '')
            self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@internationaljobplacement.com')
            self.from_name = getattr(settings, 'FROM_NAME', 'International Job Placement')
            self.debug = getattr(settings, 'DEBUG', False)
            self.enabled = bool(self.api_key and self.api_key.startswith('SG.'))
            
            if self.enabled:
                logger.info(f"E-Mail-Service AKTIVIERT (SendGrid API) - From: {self.from_email}")
            else:
                logger.info("E-Mail-Service DEAKTIVIERT (Kein gültiger SendGrid API Key)")
        except Exception as e:
            logger.error(f"E-Mail-Service Init-Fehler: {e}")
            self.enabled = False
            self.debug = False
            self.api_key = ''
    
    @_safe_email_call
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Sendet eine E-Mail über SendGrid HTTP API - CRASH-SAFE"""
        
        # Debug-Modus: Nur loggen
        if self.debug:
            logger.info(f"[DEBUG-EMAIL] An: {to_email} | Betreff: {subject}")
            return True
        
        # SendGrid nicht konfiguriert
        if not self.enabled:
            logger.warning(f"E-Mail übersprungen (SendGrid nicht konfiguriert): {to_email}")
            return True
        
        # SendGrid API verwenden
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        message = Mail(
            from_email=Email(self.from_email, self.from_name),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        if text_content:
            message.add_content(Content("text/plain", text_content))
        
        sg = SendGridAPIClient(self.api_key)
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"✅ E-Mail gesendet an {to_email} (Status: {response.status_code})")
            return True
        else:
            logger.error(f"❌ E-Mail fehlgeschlagen: {response.status_code} - {response.body}")
            return False
    
    @_safe_email_call
    def send_welcome_email(self, to_email: str, name: str, role: str) -> bool:
        """Sendet eine Willkommens-E-Mail nach der Registrierung"""
        subject = "Willkommen beim IJP Portal!"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>Willkommen beim IJP Portal!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {name},</p>
                <p>vielen Dank für Ihre Registrierung bei <strong>International Job Placement</strong>!</p>
                <p>Wir freuen uns, Sie bei der Suche nach Ihrem Traumjob zu unterstützen.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_application_received(
        self, to_email: str, applicant_name: str, job_title: str, company_name: str
    ) -> bool:
        """Benachrichtigt den Bewerber über den Eingang der Bewerbung"""
        subject = f"Bewerbung eingegangen: {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>✅ Bewerbung erfolgreich!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {applicant_name},</p>
                <p>Ihre Bewerbung für <strong>{job_title}</strong> bei <strong>{company_name}</strong> wurde erfolgreich eingereicht.</p>
                <p>Wir drücken Ihnen die Daumen!</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_new_application_notification(
        self, 
        to_email: str, 
        company_name: str, 
        applicant_name: str, 
        job_title: str,
        applicant_email: str = None,
        applicant_phone: str = None,
        position_type: str = None,
        applied_at: str = None
    ) -> bool:
        """Benachrichtigt die Firma über eine neue Bewerbung"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        # Position Type Label
        position_labels = {
            'studentenferienjob': 'Studentenferienjob',
            'saisonjob': 'Saisonjob',
            'fachkraft': 'Fachkraft',
            'ausbildung': 'Ausbildung'
        }
        position_label = position_labels.get(position_type, position_type) if position_type else ''
        
        # Datum formatieren
        date_str = ''
        if applied_at:
            try:
                from datetime import datetime
                dt = applied_at if isinstance(applied_at, datetime) else datetime.fromisoformat(str(applied_at).replace('Z', '+00:00'))
                date_str = dt.strftime('%d.%m.%Y um %H:%M Uhr')
            except:
                date_str = str(applied_at)
        
        # Kontaktdaten Section
        contact_section = ""
        if applicant_email or applicant_phone:
            contact_section = f"""
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <p style="margin: 0 0 10px 0; font-weight: bold; color: #374151;">📇 Kontaktdaten:</p>
                {'<p style="margin: 5px 0;">📧 ' + applicant_email + '</p>' if applicant_email else ''}
                {'<p style="margin: 5px 0;">📱 ' + applicant_phone + '</p>' if applicant_phone else ''}
            </div>
            """
        
        subject = f"🆕 Neue Bewerbung für: {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">📩 Neue Bewerbung eingegangen!</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #374151;">Hallo <strong>{company_name}</strong>,</p>
                
                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
                    <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #1e40af;">
                        {applicant_name}
                    </p>
                    <p style="margin: 0; color: #1e40af;">
                        hat sich auf <strong>{job_title}</strong> beworben
                    </p>
                    {f'<p style="margin: 10px 0 0 0; color: #3b82f6;">📋 Stellenart: {position_label}</p>' if position_label else ''}
                    {f'<p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">🕐 {date_str}</p>' if date_str else ''}
                </div>
                
                {contact_section}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/company/applications" 
                       style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Bewerbung ansehen →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Mit freundlichen Grüßen,<br>
                    <strong>Ihr IJP Team</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_company_registration_pending(self, to_email: str, company_name: str) -> bool:
        """Benachrichtigt die Firma über ausstehende Aktivierung"""
        subject = "IJP Portal - Registrierung eingegangen"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>⏳ Registrierung eingegangen</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {company_name},</p>
                <p>Vielen Dank für Ihre Registrierung!</p>
                <p>Ihr Konto wird derzeit von unserem Team geprüft. Sie erhalten eine E-Mail, sobald es freigeschaltet wurde.</p>
                <p>Dies dauert in der Regel 1-2 Werktage.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_company_activated(
        self, to_email: str, company_name: str, frontend_url: str = "https://ijp-portal.vercel.app"
    ) -> bool:
        """Benachrichtigt die Firma über Aktivierung"""
        subject = "IJP Portal - Konto freigeschaltet! 🎉"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>✅ Konto freigeschaltet!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {company_name},</p>
                <p><strong>Gute Nachrichten!</strong> Ihr Unternehmenskonto wurde aktiviert.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/login" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Jetzt anmelden</a>
                </p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_application_status_update(
        self, to_email: str, applicant_name: str, job_title: str, company_name: str, new_status: str
    ) -> bool:
        """Benachrichtigt den Bewerber über Statusänderung"""
        subject = f"Bewerbungsstatus aktualisiert: {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>📋 Status aktualisiert</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {applicant_name},</p>
                <p>Der Status Ihrer Bewerbung bei <strong>{company_name}</strong> für <strong>{job_title}</strong> wurde aktualisiert:</p>
                <p style="text-align: center; font-size: 24px; font-weight: bold; color: #2563eb; padding: 20px; background: white; border-radius: 8px; margin: 20px 0;">
                    {new_status}
                </p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_document_request(
        self, to_email: str, applicant_name: str, company_name: str, 
        job_title: str, requested_documents: List[str], message: str = None
    ) -> bool:
        """Benachrichtigt den Bewerber, dass Dokumente angefordert wurden"""
        subject = f"Unterlagen angefordert: {job_title} bei {company_name}"
        
        docs_list = "".join([f"<li>{doc}</li>" for doc in requested_documents])
        message_html = f"<p><strong>Nachricht:</strong> {message}</p>" if message else ""
        
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>📄 Unterlagen angefordert</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {applicant_name},</p>
                <p><strong>{company_name}</strong> hat für Ihre Bewerbung auf <strong>{job_title}</strong> folgende Unterlagen angefordert:</p>
                <ul style="background: white; padding: 20px 40px; border-radius: 8px; margin: 20px 0;">
                    {docs_list}
                </ul>
                {message_html}
                <p style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb;">
                    💡 Bitte laden Sie die fehlenden Dokumente in Ihrem Profil unter "Dokumente" hoch.
                </p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{settings.FRONTEND_URL}/applicant/documents" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Dokumente hochladen</a>
                </p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_rejection_email(
        self, to_email: str, applicant_name: str, job_title: str, 
        company_name: str, custom_subject: str = None, custom_text: str = None,
        applicant_gender: str = None, applicant_last_name: str = None
    ) -> bool:
        """Sendet benutzerdefinierte Absage-E-Mail"""
        # Anrede basierend auf Geschlecht generieren
        if applicant_gender == 'male':
            salutation = f"Sehr geehrter Herr {applicant_last_name or applicant_name}"
        elif applicant_gender == 'female':
            salutation = f"Sehr geehrte Frau {applicant_last_name or applicant_name}"
        elif applicant_gender == 'diverse':
            salutation = f"Guten Tag {applicant_name}"
        else:
            # Kein Geschlecht angegeben
            salutation = f"Sehr geehrte/r {applicant_name}"
        
        # Platzhalter ersetzen
        subject = (custom_subject or "Ihre Bewerbung bei {company_name}").format(
            company_name=company_name,
            applicant_name=applicant_name,
            job_title=job_title,
            salutation=salutation
        )
        
        text_content = (custom_text or "").format(
            company_name=company_name,
            applicant_name=applicant_name,
            job_title=job_title,
            salutation=salutation
        )
        
        # Text in HTML umwandeln (Zeilenumbrüche zu <br>)
        text_html = text_content.replace('\n', '<br>')
        
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>Bewerbungsstatus</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p style="line-height: 1.8;">{text_html}</p>
            </div>
            <div style="padding: 15px; background: #e5e7eb; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280;">
                Diese E-Mail wurde über das IJP Portal versendet.
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_password_reset(self, to_email: str, reset_link: str) -> bool:
        """Sendet Passwort-Reset-Link"""
        subject = "IJP Portal - Passwort zurücksetzen"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>🔐 Passwort zurücksetzen</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Passwort zurücksetzen</a>
                </p>
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    ⚠️ Dieser Link ist nur <strong>1 Stunde</strong> gültig.
                </p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_interview_proposed(
        self, 
        to_email: str, 
        applicant_name: str, 
        job_title: str, 
        company_name: str,
        date_1: str,
        date_2: str = None,
        location: str = None,
        meeting_link: str = None,
        notes: str = None
    ) -> bool:
        """Benachrichtigt den Bewerber über Terminvorschläge"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        date_options = f"""
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #8b5cf6;">
                <strong>Option 1:</strong> {date_1}
            </div>
        """
        if date_2:
            date_options += f"""
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #8b5cf6;">
                <strong>Option 2:</strong> {date_2}
            </div>
            """
        
        location_info = ""
        if location:
            location_info += f"<p><strong>📍 Ort:</strong> {location}</p>"
        if meeting_link:
            location_info += f'<p><strong>🔗 Meeting:</strong> <a href="{meeting_link}">Link zum Meeting</a></p>'
        if notes:
            location_info += f"<p><strong>📝 Hinweis:</strong> {notes}</p>"
        
        subject = f"📅 Terminvorschläge für Ihr Vorstellungsgespräch - {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0;">📅 Vorstellungsgespräch</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px;">
                <p>Hallo {applicant_name},</p>
                <p><strong>{company_name}</strong> möchte Sie zum Vorstellungsgespräch für die Stelle <strong>{job_title}</strong> einladen!</p>
                
                <p style="font-weight: bold; margin-top: 20px;">Terminvorschläge:</p>
                {date_options}
                
                {location_info if location_info else ''}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/applicant/applications" 
                       style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Termin bestätigen oder ablehnen →
                    </a>
                </p>
                
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    ⏰ Bitte antworten Sie zeitnah auf diese Einladung!
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">Mit freundlichen Grüßen,<br><strong>Ihr JobOn Team</strong></p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_interview_confirmed(
        self, 
        to_email: str, 
        company_name: str, 
        applicant_name: str, 
        job_title: str,
        confirmed_date: str,
        location: str = None,
        meeting_link: str = None
    ) -> bool:
        """Benachrichtigt die Firma über die Terminbestätigung"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        location_info = ""
        if location:
            location_info += f"<p><strong>📍 Ort:</strong> {location}</p>"
        if meeting_link:
            location_info += f'<p><strong>🔗 Meeting:</strong> <a href="{meeting_link}">Link zum Meeting</a></p>'
        
        subject = f"✅ Termin bestätigt: {applicant_name} - {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0;">✅ Termin bestätigt!</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px;">
                <p>Hallo {company_name},</p>
                <p><strong>{applicant_name}</strong> hat den Termin für das Vorstellungsgespräch bestätigt:</p>
                
                <div style="background: #dcfce7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #166534;">
                        📅 {confirmed_date}
                    </p>
                    <p style="margin: 10px 0 0 0; color: #166534;">
                        für <strong>{job_title}</strong>
                    </p>
                </div>
                
                {location_info if location_info else ''}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/company/applications" 
                       style="background: #22c55e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Bewerbung ansehen →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">Mit freundlichen Grüßen,<br><strong>Ihr JobOn Team</strong></p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_application_update(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str,
        new_status: str = None,
        interview_dates: list = None,
        interview_location: str = None,
        interview_link: str = None,
        interview_notes: str = None,
    ) -> bool:
        """
        Kombinierte Email für Bewerbungsupdates.
        Enthält Status-Änderung UND/ODER Interview-Termine in einer Email.
        """
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        # Status-Sektion
        status_section = ""
        if new_status:
            status_labels = {
                'pending': 'Eingereicht',
                'company_review': 'In Prüfung',
                'interview_scheduled': 'Vorstellungsgespräch geplant',
                'accepted': 'Angenommen',
                'rejected': 'Abgelehnt',
            }
            status_label = status_labels.get(new_status, new_status)
            status_section = f"""
            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2563eb;">
                <p style="margin: 0; font-weight: bold; color: #1e40af;">📋 Status aktualisiert:</p>
                <p style="margin: 5px 0 0 0; font-size: 18px; color: #1e40af;">{status_label}</p>
            </div>
            """
        
        # Interview-Sektion
        interview_section = ""
        if interview_dates:
            dates_html = ""
            for i, date in enumerate(interview_dates, 1):
                if date:
                    dates_html += f"""
                    <div style="background: white; padding: 12px; border-radius: 8px; margin: 8px 0; border-left: 4px solid #8b5cf6;">
                        <strong>Option {i}:</strong> {date}
                    </div>
                    """
            
            location_html = f"<p style='margin: 10px 0;'><strong>📍 Ort:</strong> {interview_location}</p>" if interview_location else ""
            link_html = f"<p style='margin: 10px 0;'><strong>🔗 Meeting:</strong> <a href='{interview_link}'>Link zum Online-Meeting</a></p>" if interview_link else ""
            notes_html = f"<p style='margin: 10px 0;'><strong>📝 Hinweis:</strong> {interview_notes}</p>" if interview_notes else ""
            
            interview_section = f"""
            <div style="background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #8b5cf6;">
                <p style="margin: 0 0 15px 0; font-weight: bold; color: #6b21a8; font-size: 16px;">
                    📅 Terminvorschläge für Ihr Vorstellungsgespräch:
                </p>
                {dates_html}
                {location_html}
                {link_html}
                {notes_html}
                <p style="margin: 15px 0 0 0; padding: 10px; background: #fef3c7; border-radius: 6px; font-size: 14px; color: #92400e;">
                    ⏰ Bitte bestätigen Sie einen der Termine oder fordern Sie neue Termine an!
                </p>
            </div>
            """
        
        subject = f"📬 Update zu Ihrer Bewerbung - {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 22px;">📬 Neuigkeiten zu Ihrer Bewerbung</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px;">
                <p style="font-size: 16px;">Hallo {applicant_name},</p>
                <p>es gibt Neuigkeiten zu Ihrer Bewerbung für <strong>{job_title}</strong> bei <strong>{company_name}</strong>:</p>
                
                {status_section}
                {interview_section}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/applicant/applications" 
                       style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Bewerbung ansehen →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">Mit freundlichen Grüßen,<br><strong>Ihr JobOn Team</strong></p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)

    @_safe_email_call
    def send_interview_declined(
        self, 
        to_email: str, 
        company_name: str, 
        applicant_name: str, 
        job_title: str,
        reason: str = None
    ) -> bool:
        """Benachrichtigt die Firma, dass der Bewerber die Termine abgelehnt hat"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        reason_section = ""
        if reason:
            reason_section = f"""
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
                <strong>Grund:</strong> {reason}
            </div>
            """
        
        subject = f"⚠️ Terminabsage: {applicant_name} - Bitte neue Termine vorschlagen"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0;">⚠️ Terminabsage</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px;">
                <p>Hallo {company_name},</p>
                <p><strong>{applicant_name}</strong> konnte die vorgeschlagenen Termine für das Vorstellungsgespräch (<strong>{job_title}</strong>) leider nicht wahrnehmen.</p>
                
                {reason_section}
                
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    📅 Bitte schlagen Sie <strong>neue Termine</strong> vor!
                </p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/company/applications" 
                       style="background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Neue Termine vorschlagen →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">Mit freundlichen Grüßen,<br><strong>Ihr JobOn Team</strong></p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)

    @_safe_email_call
    def send_interview_cancelled(
        self,
        to_email: str,
        recipient_name: str,
        other_party_name: str,
        job_title: str,
        cancelled_date: str,
        reason: str = None,
        cancelled_by: str = "company"  # "company" oder "applicant"
    ) -> bool:
        """Benachrichtigt über eine Terminabsage"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        if cancelled_by == "company":
            who_cancelled = "Das Unternehmen"
            action_url = f"{frontend_url}/applicant/applications"
            action_text = "Bewerbung ansehen"
        else:
            who_cancelled = "Der Bewerber"
            action_url = f"{frontend_url}/company/applications"
            action_text = "Bewerbungen ansehen"
        
        reason_section = ""
        if reason:
            reason_section = f"""
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ef4444;">
                <strong>Grund:</strong> {reason}
            </div>
            """
        
        subject = f"❌ Termin abgesagt - {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0;">❌ Termin abgesagt</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px;">
                <p>Hallo {recipient_name},</p>
                <p><strong>{who_cancelled}</strong> hat den Termin für das Vorstellungsgespräch abgesagt:</p>
                
                <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                    <p style="margin: 0; text-decoration: line-through; color: #991b1b;">
                        📅 {cancelled_date}
                    </p>
                    <p style="margin: 10px 0 0 0; color: #991b1b;">
                        für <strong>{job_title}</strong>
                    </p>
                </div>
                
                {reason_section}
                
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    💡 Sie können gerne neue Termine vereinbaren.
                </p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{action_url}" 
                       style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        {action_text} →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">Mit freundlichen Grüßen,<br><strong>Ihr JobOn Team</strong></p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)

    @_safe_email_call
    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str = None) -> bool:
        """Sendet Passwort-Reset-Link (async für account.py)"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://ijp-portal.vercel.app')
        except:
            frontend_url = 'https://ijp-portal.vercel.app'
        
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        greeting = f"Hallo {user_name}," if user_name else "Hallo,"
        
        subject = "IJP Portal - Passwort zurücksetzen"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>🔐 Passwort zurücksetzen</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>{greeting}</p>
                <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Passwort zurücksetzen</a>
                </p>
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    ⚠️ Dieser Link ist nur <strong>1 Stunde</strong> gültig.
                </p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)

    @_safe_email_call
    def send_job_notification(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str,
        location: str,
        match_score: int,
        job_url: str
    ) -> bool:
        """Benachrichtigt Bewerber über passende neue Stelle"""
        subject = f"Neue passende Stelle: {job_title}"
        
        # Match-Score Farbe
        if match_score >= 90:
            score_color = "#22c55e"  # Grün
            score_text = "Sehr gut"
        elif match_score >= 80:
            score_color = "#3b82f6"  # Blau
            score_text = "Gut"
        else:
            score_color = "#f59e0b"  # Orange
            score_text = "Passend"
        
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>🎯 Passende Stelle gefunden!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {applicant_name},</p>
                <p>wir haben eine neue Stelle gefunden, die gut zu Ihrem Profil passt:</p>
                
                <div style="background: white; border-radius: 12px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <h2 style="color: #1f2937; margin-top: 0;">{job_title}</h2>
                    <p style="color: #6b7280; margin: 5px 0;">🏢 {company_name}</p>
                    <p style="color: #6b7280; margin: 5px 0;">📍 {location}</p>
                    <div style="margin-top: 15px;">
                        <span style="background: {score_color}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">
                            {match_score}% {score_text}
                        </span>
                    </div>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{job_url}" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Stelle ansehen →
                    </a>
                </p>
                
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                    Sie erhalten diese E-Mail, weil Sie Job-Benachrichtigungen aktiviert haben. 
                    Sie können diese in Ihren <a href="https://jobon.work/einstellungen">Einstellungen</a> deaktivieren.
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)


# Singleton - CRASH-SAFE initialisiert
try:
    email_service = EmailService()
except Exception as e:
    logger.error(f"EmailService konnte nicht erstellt werden: {e}")
    # Dummy-Service der nichts tut
    class DummyEmailService:
        def __getattr__(self, name):
            return lambda *args, **kwargs: True
    email_service = DummyEmailService()
