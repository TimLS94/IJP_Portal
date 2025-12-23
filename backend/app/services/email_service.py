import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

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
    """Service zum Versenden von E-Mails - CRASH-SAFE"""
    
    def __init__(self):
        try:
            from app.core.config import settings
            self.smtp_host = getattr(settings, 'SMTP_HOST', '')
            self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
            self.smtp_user = getattr(settings, 'SMTP_USER', '')
            self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
            self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@ijp-portal.de')
            self.from_name = getattr(settings, 'FROM_NAME', 'IJP Portal')
            self.debug = getattr(settings, 'DEBUG', False)
            self.enabled = bool(self.smtp_user and self.smtp_password and self.smtp_host)
            
            if not self.enabled:
                logger.info("E-Mail-Service DEAKTIVIERT (SMTP nicht konfiguriert)")
        except Exception as e:
            logger.error(f"E-Mail-Service Init-Fehler: {e}")
            self.enabled = False
            self.debug = False
    
    def _is_ready(self) -> bool:
        """Prüft ob E-Mail-Versand möglich ist"""
        if self.debug:
            return True  # Im Debug-Modus nur loggen
        return self.enabled
    
    @_safe_email_call
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Sendet eine E-Mail - CRASH-SAFE"""
        
        # Debug-Modus: Nur loggen
        if self.debug:
            logger.info(f"[DEBUG-EMAIL] An: {to_email} | Betreff: {subject}")
            return True
        
        # SMTP nicht konfiguriert: Still überspringen
        if not self.enabled:
            logger.debug(f"E-Mail übersprungen (SMTP deaktiviert): {to_email}")
            return True
        
        # E-Mail zusammenbauen
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['To'] = to_email
        
        if text_content:
            msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # E-Mail senden mit kurzem Timeout
        with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=5) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            server.sendmail(self.from_email, to_email, msg.as_string())
        
        logger.info(f"E-Mail gesendet: {to_email}")
        return True
    
    @_safe_email_call
    def send_welcome_email(self, to_email: str, name: str, role: str) -> bool:
        """Sendet eine Willkommens-E-Mail nach der Registrierung"""
        subject = "Willkommen beim IJP Portal!"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Willkommen beim IJP Portal!</h1>
            <p>Hallo {name},</p>
            <p>vielen Dank für Ihre Registrierung!</p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
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
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Bewerbung erfolgreich!</h1>
            <p>Hallo {applicant_name},</p>
            <p>Ihre Bewerbung für <strong>{job_title}</strong> bei <strong>{company_name}</strong> wurde eingereicht.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
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
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Neue Bewerbung!</h1>
            <p>Hallo {company_name},</p>
            <p><strong>{applicant_name}</strong> hat sich auf <strong>{job_title}</strong> beworben.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_company_registration_pending(self, to_email: str, company_name: str) -> bool:
        """Benachrichtigt die Firma über ausstehende Aktivierung"""
        subject = "IJP Portal - Registrierung eingegangen"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Registrierung eingegangen</h1>
            <p>Hallo {company_name},</p>
            <p>Ihre Registrierung wird geprüft. Sie erhalten eine E-Mail nach der Freischaltung.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
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
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #22c55e;">✅ Konto freigeschaltet!</h1>
            <p>Hallo {company_name},</p>
            <p>Ihr Konto wurde aktiviert. <a href="{frontend_url}/login">Jetzt anmelden</a></p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
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
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Status aktualisiert</h1>
            <p>Hallo {applicant_name},</p>
            <p>Der Status Ihrer Bewerbung bei {company_name} für {job_title}: <strong>{new_status}</strong></p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content)
    
    @_safe_email_call
    def send_password_reset(self, to_email: str, reset_link: str) -> bool:
        """Sendet Passwort-Reset-Link"""
        subject = "IJP Portal - Passwort zurücksetzen"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif;">
            <h1 style="color: #2563eb;">Passwort zurücksetzen</h1>
            <p>Klicken Sie hier um Ihr Passwort zurückzusetzen:</p>
            <p><a href="{reset_link}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Passwort zurücksetzen</a></p>
            <p>Link gültig für 1 Stunde.</p>
            <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
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
