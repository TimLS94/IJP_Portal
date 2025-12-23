import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
from jinja2 import Template
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service zum Versenden von E-Mails"""
    
    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', 'localhost')
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_user = getattr(settings, 'SMTP_USER', '')
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', '')
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@ijp-portal.de')
        self.from_name = getattr(settings, 'FROM_NAME', 'IJP Portal')
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Sendet eine E-Mail"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Plain text fallback
            if text_content:
                part1 = MIMEText(text_content, 'plain', 'utf-8')
                msg.attach(part1)
            
            # HTML content
            part2 = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(part2)
            
            # In Development-Modus nur loggen
            if settings.DEBUG:
                logger.info(f"[DEBUG] E-Mail würde gesendet an: {to_email}")
                logger.info(f"[DEBUG] Betreff: {subject}")
                logger.info(f"[DEBUG] Inhalt: {html_content[:200]}...")
                return True
            
            # Produktiv: E-Mail senden (nur wenn SMTP konfiguriert)
            if not self.smtp_user or not self.smtp_password:
                logger.warning(f"SMTP nicht konfiguriert - E-Mail an {to_email} wird übersprungen")
                return True  # Nicht blockieren wenn SMTP nicht eingerichtet
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, to_email, msg.as_string())
            
            logger.info(f"E-Mail gesendet an: {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"E-Mail-Versand fehlgeschlagen: {str(e)}")
            return False
    
    def send_welcome_email(self, to_email: str, name: str, role: str) -> bool:
        """Sendet eine Willkommens-E-Mail nach der Registrierung"""
        subject = "Willkommen beim IJP Portal!"
        
        if role == 'applicant':
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb;">Willkommen beim IJP Portal!</h1>
                    <p>Hallo {name},</p>
                    <p>vielen Dank für Ihre Registrierung beim IJP Portal - Ihrer Plattform für internationale Jobvermittlung.</p>
                    <p><strong>So geht es weiter:</strong></p>
                    <ol>
                        <li>Vervollständigen Sie Ihr <a href="http://localhost:5173/applicant/profile" style="color: #2563eb;">Profil</a></li>
                        <li>Laden Sie wichtige <a href="http://localhost:5173/applicant/documents" style="color: #2563eb;">Dokumente</a> hoch</li>
                        <li>Durchsuchen Sie unsere <a href="http://localhost:5173/jobs" style="color: #2563eb;">Stellenangebote</a></li>
                        <li>Bewerben Sie sich mit nur einem Klick!</li>
                    </ol>
                    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
                    <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
                </div>
            </body>
            </html>
            """
        else:
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb;">Willkommen beim IJP Portal!</h1>
                    <p>Hallo {name},</p>
                    <p>vielen Dank für die Registrierung Ihres Unternehmens beim IJP Portal.</p>
                    <p><strong>So geht es weiter:</strong></p>
                    <ol>
                        <li>Vervollständigen Sie Ihr <a href="http://localhost:5173/company/dashboard" style="color: #2563eb;">Firmenprofil</a></li>
                        <li>Erstellen Sie Ihre ersten <a href="http://localhost:5173/company/jobs/new" style="color: #2563eb;">Stellenangebote</a></li>
                        <li>Erreichen Sie qualifizierte Bewerber aus aller Welt</li>
                    </ol>
                    <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
                    <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
                </div>
            </body>
            </html>
            """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_application_received(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str
    ) -> bool:
        """Benachrichtigt den Bewerber über den Eingang der Bewerbung"""
        subject = f"Bewerbung eingegangen: {job_title}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Bewerbung erfolgreich!</h1>
                <p>Hallo {applicant_name},</p>
                <p>Ihre Bewerbung für die Stelle <strong>"{job_title}"</strong> bei <strong>{company_name}</strong> wurde erfolgreich eingereicht.</p>
                <p>Sie können den Status Ihrer Bewerbung jederzeit in Ihrem <a href="http://localhost:5173/applicant/applications" style="color: #2563eb;">Bewerbungs-Dashboard</a> verfolgen.</p>
                <p>Wir drücken Ihnen die Daumen!</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_new_application_notification(
        self,
        to_email: str,
        company_name: str,
        applicant_name: str,
        job_title: str
    ) -> bool:
        """Benachrichtigt die Firma über eine neue Bewerbung"""
        subject = f"Neue Bewerbung: {job_title}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Neue Bewerbung eingegangen!</h1>
                <p>Hallo {company_name},</p>
                <p>Sie haben eine neue Bewerbung erhalten:</p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Stelle:</strong> {job_title}</p>
                    <p><strong>Bewerber:</strong> {applicant_name}</p>
                </div>
                <p><a href="http://localhost:5173/company/applications" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Bewerbung ansehen</a></p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_company_registration_pending(
        self,
        to_email: str,
        company_name: str
    ) -> bool:
        """Benachrichtigt die Firma, dass die Registrierung eingegangen ist und auf Aktivierung wartet"""
        subject = "IJP Portal - Registrierung eingegangen"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Registrierung eingegangen</h1>
                <p>Hallo {company_name},</p>
                <p>vielen Dank für Ihre Registrierung beim IJP Portal!</p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #92400e;">⏳ Warten auf Freischaltung</p>
                    <p style="margin: 10px 0 0 0; color: #92400e;">
                        Ihr Unternehmenskonto wird derzeit von unserem Team geprüft. 
                        Sie erhalten eine E-Mail, sobald Ihr Konto freigeschaltet wurde.
                    </p>
                </div>
                <p>Dieser Prozess dauert in der Regel 1-2 Werktage.</p>
                <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_company_activated(
        self,
        to_email: str,
        company_name: str,
        frontend_url: str = "https://ijp-portal.vercel.app"
    ) -> bool:
        """Benachrichtigt die Firma, dass ihr Konto aktiviert wurde"""
        subject = "IJP Portal - Ihr Konto wurde freigeschaltet! 🎉"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #22c55e;">✅ Konto freigeschaltet!</h1>
                <p>Hallo {company_name},</p>
                <p><strong>Gute Nachrichten!</strong> Ihr Unternehmenskonto beim IJP Portal wurde erfolgreich freigeschaltet.</p>
                <div style="background: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #166534;">Sie können jetzt loslegen!</p>
                </div>
                <p><strong>Nächste Schritte:</strong></p>
                <ol>
                    <li><a href="{frontend_url}/login" style="color: #2563eb;">Melden Sie sich an</a></li>
                    <li>Vervollständigen Sie Ihr Firmenprofil</li>
                    <li>Erstellen Sie Ihre ersten Stellenangebote</li>
                    <li>Erreichen Sie qualifizierte Bewerber aus aller Welt</li>
                </ol>
                <p style="margin-top: 20px;">
                    <a href="{frontend_url}/login" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                        Jetzt anmelden
                    </a>
                </p>
                <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    def send_application_status_update(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str,
        new_status: str
    ) -> bool:
        """Benachrichtigt den Bewerber über Statusänderung"""
        status_messages = {
            'reviewing': ('In Prüfung', 'Ihre Bewerbung wird derzeit geprüft.'),
            'interview': ('Vorstellungsgespräch', 'Sie wurden zu einem Vorstellungsgespräch eingeladen! Die Firma wird sich in Kürze mit Details bei Ihnen melden.'),
            'accepted': ('Angenommen', 'Herzlichen Glückwunsch! Ihre Bewerbung wurde angenommen. Die Firma wird sich mit den nächsten Schritten bei Ihnen melden.'),
            'rejected': ('Abgelehnt', 'Leider wurde Ihre Bewerbung abgelehnt. Lassen Sie sich nicht entmutigen und bewerben Sie sich auf weitere Stellen!')
        }
        
        status_label, message = status_messages.get(new_status, ('Aktualisiert', 'Der Status Ihrer Bewerbung wurde aktualisiert.'))
        
        subject = f"Bewerbungsstatus: {status_label} - {job_title}"
        
        status_colors = {
            'reviewing': '#3b82f6',
            'interview': '#8b5cf6',
            'accepted': '#22c55e',
            'rejected': '#ef4444'
        }
        color = status_colors.get(new_status, '#6b7280')
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Bewerbungsstatus aktualisiert</h1>
                <p>Hallo {applicant_name},</p>
                <p>Der Status Ihrer Bewerbung bei <strong>{company_name}</strong> für die Stelle <strong>"{job_title}"</strong> wurde aktualisiert:</p>
                <div style="background: {color}; color: white; padding: 15px 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <strong style="font-size: 18px;">{status_label}</strong>
                </div>
                <p>{message}</p>
                <p><a href="http://localhost:5173/applicant/applications" style="color: #2563eb;">Zu meinen Bewerbungen</a></p>
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Portal Team</p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)


# Singleton-Instanz
email_service = EmailService()
