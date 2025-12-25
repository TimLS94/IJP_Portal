"""
E-Mail Service mit SendGrid HTTP API - CRASH-SAFE
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _safe_email_call(func):
    """Decorator der ALLE E-Mail-Fehler abfängt - App darf NIEMALS crashen!"""
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"E-Mail-Fehler (ignoriert): {type(e).__name__}: {str(e)}")
            return True  # Immer True zurückgeben, damit App weiterläuft
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
        self, to_email: str, company_name: str, applicant_name: str, job_title: str
    ) -> bool:
        """Benachrichtigt die Firma über eine neue Bewerbung"""
        subject = f"Neue Bewerbung: {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>📩 Neue Bewerbung!</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Hallo {company_name},</p>
                <p><strong>{applicant_name}</strong> hat sich auf die Stelle <strong>{job_title}</strong> beworben.</p>
                <p>Loggen Sie sich ein, um die Bewerbung zu sehen.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
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
