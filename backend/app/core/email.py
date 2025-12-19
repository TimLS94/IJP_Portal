"""
E-Mail Service für das IJP Portal.
Unterstützt SMTP für Produktion und Console-Output für Entwicklung.
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = getattr(settings, 'SMTP_HOST', None)
        self.smtp_port = getattr(settings, 'SMTP_PORT', 587)
        self.smtp_user = getattr(settings, 'SMTP_USER', None)
        self.smtp_password = getattr(settings, 'SMTP_PASSWORD', None)
        self.from_email = getattr(settings, 'FROM_EMAIL', 'noreply@ijp-portal.de')
        self.from_name = getattr(settings, 'FROM_NAME', 'IJP Portal')
    
    def _is_configured(self) -> bool:
        """Prüft ob SMTP konfiguriert ist"""
        return bool(self.smtp_host and self.smtp_user and self.smtp_password)
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Sendet eine E-Mail"""
        
        if not self._is_configured():
            # Entwicklungsmodus: E-Mail in Console ausgeben
            logger.info("=" * 60)
            logger.info("📧 E-MAIL (Entwicklungsmodus)")
            logger.info(f"An: {to_email}")
            logger.info(f"Betreff: {subject}")
            logger.info("-" * 60)
            logger.info(text_content or html_content)
            logger.info("=" * 60)
            print("\n" + "=" * 60)
            print("📧 E-MAIL (Entwicklungsmodus)")
            print(f"An: {to_email}")
            print(f"Betreff: {subject}")
            print("-" * 60)
            print(text_content or html_content)
            print("=" * 60 + "\n")
            return True
        
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            if text_content:
                msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)
            
            logger.info(f"E-Mail gesendet an {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Fehler beim Senden der E-Mail: {e}")
            return False
    
    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str = None):
        """Sendet eine Passwort-Reset E-Mail"""
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        subject = "Passwort zurücksetzen - IJP Portal"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }}
                .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
                .warning {{ background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Passwort zurücksetzen</h1>
                </div>
                <div class="content">
                    <p>Hallo{' ' + user_name if user_name else ''},</p>
                    <p>Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.</p>
                    <p>Klicken Sie auf den folgenden Button, um ein neues Passwort zu wählen:</p>
                    
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Passwort zurücksetzen</a>
                    </p>
                    
                    <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
                    <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px; font-size: 14px;">
                        {reset_link}
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Wichtig:</strong> Dieser Link ist nur <strong>1 Stunde</strong> gültig. 
                        Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.
                    </div>
                </div>
                <div class="footer">
                    <p>© IJP Portal - International Job Placement</p>
                    <p>Diese E-Mail wurde automatisch generiert.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
Passwort zurücksetzen - IJP Portal

Hallo{' ' + user_name if user_name else ''},

Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt.

Klicken Sie auf den folgenden Link, um ein neues Passwort zu wählen:
{reset_link}

WICHTIG: Dieser Link ist nur 1 Stunde gültig.
Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.

---
IJP Portal - International Job Placement
        """
        
        return await self.send_email(to_email, subject, html_content, text_content)


# Singleton-Instanz
email_service = EmailService()
