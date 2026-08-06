"""
E-Mail Service mit SendGrid HTTP API - CRASH-SAFE
"""
import logging
from typing import Optional, List
from app.core.config import settings  # modul-weit, damit nie ein NameError 'settings' auftritt

logger = logging.getLogger(__name__)


def log_email(email_type: str, recipient: str, subject: str, success: bool = True):
    """Speichert E-Mail-Log für Statistiken"""
    try:
        from app.core.database import SessionLocal
        from app.models.email_log import EmailLog
        
        db = SessionLocal()
        try:
            # email_type ist jetzt ein String (nicht mehr Enum)
            log_entry = EmailLog(
                email_type=email_type.lower() if email_type else "other",
                recipient_email=recipient,
                subject=subject[:500] if subject else None,
                success=1 if success else 0
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"E-Mail-Log konnte nicht gespeichert werden: {e}")


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

            # Optionaler separater SMTP-Weg für Kaltakquise (z.B. Gmail)
            self.outreach_smtp_host = getattr(settings, 'OUTREACH_SMTP_HOST', 'smtp.gmail.com')
            self.outreach_smtp_port = int(getattr(settings, 'OUTREACH_SMTP_PORT', 587) or 587)
            self.outreach_smtp_user = getattr(settings, 'OUTREACH_SMTP_USER', '') or ''
            self.outreach_smtp_password = getattr(settings, 'OUTREACH_SMTP_PASSWORD', '') or ''
            self.outreach_from_email = getattr(settings, 'OUTREACH_FROM_EMAIL', '') or self.outreach_smtp_user
            self.outreach_from_name = getattr(settings, 'OUTREACH_FROM_NAME', '') or 'IJP International Job Placement'
            # Aktiv, sobald Benutzer + Passwort (App-Passwort) hinterlegt sind
            self.outreach_smtp_enabled = bool(self.outreach_smtp_user and self.outreach_smtp_password)

            if self.enabled:
                logger.info(f"E-Mail-Service AKTIVIERT (SendGrid API) - From: {self.from_email}")
            else:
                logger.info("E-Mail-Service DEAKTIVIERT (Kein gültiger SendGrid API Key)")
            if self.outreach_smtp_enabled:
                logger.info(f"Kaltakquise-Versand über SMTP AKTIV ({self.outreach_smtp_host}) - From: {self.outreach_from_email}")
        except Exception as e:
            logger.error(f"E-Mail-Service Init-Fehler: {e}")
            self.enabled = False
            self.debug = False
            self.api_key = ''
            self.outreach_smtp_enabled = False
    
    @_safe_email_call
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        email_type: str = "other",
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        attachments: Optional[List[dict]] = None
    ) -> bool:
        """Sendet eine E-Mail über SendGrid HTTP API - CRASH-SAFE
        
        attachments: Liste von dicts mit keys: filename, content (base64), type (mime)
        """
        
        # Verwende übergebene Absender oder Standard
        sender_email = from_email or self.from_email
        sender_name = from_name or self.from_name
        
        # Debug-Modus: Nur loggen
        if self.debug:
            att_info = f" + {len(attachments)} Anhänge" if attachments else ""
            logger.info(f"[DEBUG-EMAIL] Von: {sender_email} | An: {to_email} | Betreff: {subject}{att_info}")
            try:
                log_email(email_type, to_email, subject, True)
            except Exception as e:
                logger.warning(f"E-Mail-Log fehlgeschlagen: {e}")
            return True
        
        # SendGrid nicht konfiguriert
        if not self.enabled:
            logger.warning(f"E-Mail übersprungen (SendGrid nicht konfiguriert): {to_email}")
            return True
        
        # SendGrid API verwenden
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition
        
        message = Mail(
            from_email=Email(sender_email, sender_name),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        if text_content:
            message.add_content(Content("text/plain", text_content))
        
        # Anhänge hinzufügen
        if attachments:
            for att in attachments:
                attachment = Attachment(
                    FileContent(att["content"]),
                    FileName(att["filename"]),
                    FileType(att["type"]),
                    Disposition("attachment")
                )
                message.add_attachment(attachment)
        
        sg = SendGridAPIClient(self.api_key)
        response = sg.send(message)
        
        if response.status_code in [200, 201, 202]:
            att_info = f" + {len(attachments)} Anhänge" if attachments else ""
            logger.info(f"✅ E-Mail gesendet an {to_email} (Status: {response.status_code}){att_info}")
            try:
                log_email(email_type, to_email, subject, True)
            except Exception as e:
                logger.warning(f"E-Mail-Log fehlgeschlagen: {e}")
            return True
        else:
            logger.error(f"❌ E-Mail fehlgeschlagen: {response.status_code} - {response.body}")
            try:
                log_email(email_type, to_email, subject, False)
            except Exception as e:
                logger.warning(f"E-Mail-Log fehlgeschlagen: {e}")
            return False
    
    def _send_via_smtp(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        attachments: Optional[List[dict]] = None,
        email_type: str = "cold_outreach",
    ) -> bool:
        """Versendet eine E-Mail über ein separates SMTP-Konto (z.B. Gmail) inkl.
        Anhängen (PDF etc.). Absender ist zwingend das SMTP-Konto/verifizierter Alias
        (Gmail überschreibt fremde Absender). Fehler werden abgefangen -> False."""
        import base64
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.application import MIMEApplication
        from email.utils import formataddr

        sender_email = self.outreach_from_email or self.outreach_smtp_user

        # Debug-Modus: nur loggen, nicht senden
        if self.debug:
            att_info = f" + {len(attachments)} Anhänge" if attachments else ""
            logger.info(f"[DEBUG-SMTP] Von: {sender_email} | An: {to_email} | Betreff: {subject}{att_info}")
            log_email(email_type, to_email, subject, True)
            return True

        msg = MIMEMultipart()
        msg["From"] = formataddr((self.outreach_from_name, sender_email))
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        for att in attachments or []:
            try:
                raw = base64.b64decode(att["content"])
                subtype = (att.get("type") or "application/octet-stream").split("/")[-1]
                part = MIMEApplication(raw, _subtype=subtype)
                part.add_header("Content-Disposition", "attachment", filename=att["filename"])
                msg.attach(part)
            except Exception as e:
                logger.error(f"SMTP-Anhang '{att.get('filename')}' fehlgeschlagen: {e}")

        try:
            if self.outreach_smtp_port == 465:
                server = smtplib.SMTP_SSL(self.outreach_smtp_host, self.outreach_smtp_port, timeout=30)
            else:
                server = smtplib.SMTP(self.outreach_smtp_host, self.outreach_smtp_port, timeout=30)
                server.starttls()
            try:
                server.login(self.outreach_smtp_user, self.outreach_smtp_password)
                server.sendmail(sender_email, [to_email], msg.as_string())
            finally:
                server.quit()
            logger.info(f"✅ E-Mail via SMTP gesendet an {to_email}")
            log_email(email_type, to_email, subject, True)
            return True
        except Exception as e:
            logger.error(f"❌ SMTP-Versand fehlgeschlagen an {to_email}: {type(e).__name__}: {e}")
            log_email(email_type, to_email, subject, False)
            return False

    def send_outreach(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        attachments: Optional[List[dict]] = None,
        from_email: Optional[str] = None,
        from_name: Optional[str] = None,
        email_type: str = "cold_outreach",
        use_gmail: Optional[bool] = None,
    ) -> bool:
        """Kaltakquise-/Vertriebsversand. Wahl des Versandwegs:
        - use_gmail None  -> bisheriges Verhalten (Gmail, falls konfiguriert; sonst SendGrid)
        - use_gmail True  -> über das Gmail-SMTP-Konto (falls konfiguriert; sonst SendGrid-Fallback)
        - use_gmail False -> immer über SendGrid mit dem gewählten Absender (from_email)
        Beide Wege unterstützen Anhänge (PDF)."""
        want_gmail = self.outreach_smtp_enabled if use_gmail is None else bool(use_gmail)
        if want_gmail and self.outreach_smtp_enabled:
            return self._send_via_smtp(
                to_email=to_email,
                subject=subject,
                html_content=html_content,
                attachments=attachments,
                email_type=email_type,
            )
        # SendGrid-Weg (gewählter Absender). Auch Fallback, wenn Gmail gewünscht,
        # aber nicht konfiguriert ist.
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            email_type=email_type,
            from_email=from_email,
            from_name=from_name,
            attachments=attachments,
        )

    @_safe_email_call
    def send_welcome_email(self, to_email: str, name: str, role: str, lang: str = "de") -> bool:
        """Sendet eine Willkommens-E-Mail nach der Registrierung.
        Bewerber: in bevorzugter Sprache (lang). Firmen: immer Deutsch."""
        from app.services.email_i18n import et
        l = "de" if role == "company" else lang
        subject = et(l, "welcome_subject")
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>{et(l, "welcome_h1")}</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>{et(l, "greeting", name=name)}</p>
                <p>{et(l, "welcome_p1")}</p>
                <p>{et(l, "welcome_p2")}</p>
                <p>{et(l, "regards")}</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="welcome")
    
    @_safe_email_call
    def send_application_received(
        self, to_email: str, applicant_name: str, job_title: str, company_name: str, lang: str = "de"
    ) -> bool:
        """Benachrichtigt den Bewerber über den Eingang der Bewerbung (in bevorzugter Sprache)"""
        from app.services.email_i18n import et
        subject = et(lang, "received_subject", job=job_title)
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>{et(lang, "received_h1")}</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>{et(lang, "greeting", name=applicant_name)}</p>
                <p>{et(lang, "received_p1", job=job_title, company=company_name)}</p>
                <p>{et(lang, "received_p2")}</p>
                <p>{et(lang, "regards")}</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="application_received")
    
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
        applied_at: str = None,
        application_id: int = None
    ) -> bool:
        """Benachrichtigt die Firma über eine neue Bewerbung"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
            # Direkt zum Bewerber-Detail springen, falls die Bewerbung bekannt ist
            applications_link = f"{frontend_url}/company/applications"
            if application_id:
                applications_link += f"?application={application_id}"
        except:
            frontend_url = 'https://www.jobon.work'
        
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
                    <a href="{applications_link}"
                       style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Bewerbung ansehen →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Mit freundlichen Grüßen,<br>
                    <strong>Ihr JobOn Team</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="new_application")
    
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
                <p>Mit freundlichen Grüßen,<br>Ihr JobOn Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="company_pending")
    
    @_safe_email_call
    def send_admin_new_company_notification(
        self, to_email: str, company_name: str, company_email: str, 
        legal_form: str, address: str, phone: str
    ) -> bool:
        """Benachrichtigt Admins über neue Firmen-Registrierung"""
        subject = "🏢 Neue Firmen-Registrierung wartet auf Freischaltung"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>🏢 Neue Firmen-Registrierung</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>Eine neue Firma hat sich registriert und wartet auf Freischaltung:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Firmenname:</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{company_name}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Rechtsform:</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{legal_form}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">E-Mail:</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{company_email}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Adresse:</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{address}</td></tr>
                    <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Telefon:</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">{phone}</td></tr>
                </table>
                <p style="text-align: center; margin: 30px 0;">
                    <a href="https://ijp-portal.onrender.com/admin/users" style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Im Admin-Bereich prüfen</a>
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="admin_notification")
    
    @_safe_email_call
    def send_company_activated(
        self, to_email: str, company_name: str, frontend_url: str = "https://www.jobon.work"
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
                <p>Mit freundlichen Grüßen,<br>Ihr JobOn Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="company_activated")
    
    @_safe_email_call
    def send_application_status_update(
        self, to_email: str, applicant_name: str, job_title: str, company_name: str, new_status: str, lang: str = "de"
    ) -> bool:
        """Benachrichtigt den Bewerber über Statusänderung (in bevorzugter Sprache)"""
        from app.services.email_i18n import et, status_label
        display_status = status_label(lang, new_status)

        subject = et(lang, "status_subject", job=job_title)
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1>{et(lang, "status_h1")}</h1>
            </div>
            <div style="padding: 30px; background: #f9fafb;">
                <p>{et(lang, "greeting", name=applicant_name)}</p>
                <p>{et(lang, "status_intro", company=company_name, job=job_title)}</p>
                <p style="text-align: center; font-size: 24px; font-weight: bold; color: #2563eb; padding: 20px; background: white; border-radius: 8px; margin: 20px 0;">
                    {display_status}
                </p>
                <p>{et(lang, "regards")}</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="application_status")
    
    @_safe_email_call
    def send_document_request(
        self, to_email: str, applicant_name: str, company_name: str, 
        job_title: str, requested_documents: List[str], message: str = None
    ) -> bool:
        """Benachrichtigt den Bewerber, dass Dokumente angefordert wurden"""
        from app.core.config import settings
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
                <p>Mit freundlichen Grüßen,<br>Ihr JobOn Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="other")
    
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
        return self.send_email(to_email, subject, html_content, email_type="application_status")
    
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
                <p>Mit freundlichen Grüßen,<br>Ihr JobOn Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="password_reset")
    
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
        notes: str = None,
        lang: str = "de"
    ) -> bool:
        """Benachrichtigt den Bewerber über Terminvorschläge (in bevorzugter Sprache)"""
        from app.services.email_i18n import et
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'

        opt = et(lang, "iv_option")
        date_options = f"""
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #8b5cf6;">
                <strong>{opt} 1:</strong> {date_1}
            </div>
        """
        if date_2:
            date_options += f"""
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #8b5cf6;">
                <strong>{opt} 2:</strong> {date_2}
            </div>
            """

        location_info = ""
        if location:
            location_info += f"<p><strong>{et(lang, 'iv_location')}</strong> {location}</p>"
        if meeting_link:
            location_info += f'<p><strong>{et(lang, "iv_meeting")}</strong> <a href="{meeting_link}">{et(lang, "iv_meeting_link")}</a></p>'
        if notes:
            location_info += f"<p><strong>{et(lang, 'iv_note')}</strong> {notes}</p>"

        subject = et(lang, "iv_subject", job=job_title)
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0;">{et(lang, "iv_h1")}</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px;">
                <p>{et(lang, "greeting", name=applicant_name)}</p>
                <p>{et(lang, "iv_intro", company=company_name, job=job_title)}</p>

                <p style="font-weight: bold; margin-top: 20px;">{et(lang, "iv_options")}</p>
                {date_options}

                {location_info if location_info else ''}

                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/applicant/applications"
                       style="background: #8b5cf6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        {et(lang, "iv_cta")}
                    </a>
                </p>

                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    {et(lang, "iv_urgent")}
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                <p style="color: #6b7280; font-size: 14px;">{et(lang, "regards")}</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="other")
    
    @_safe_email_call
    def send_interview_confirmed(
        self, 
        to_email: str, 
        company_name: str, 
        applicant_name: str, 
        job_title: str,
        confirmed_date: str,
        location: str = None,
        meeting_link: str = None,
        applicant_message: str = None
    ) -> bool:
        """Benachrichtigt die Firma über die Terminbestätigung"""
        import html as _html
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'

        location_info = ""
        if location:
            location_info += f"<p><strong>📍 Ort:</strong> {location}</p>"
        if meeting_link:
            location_info += f'<p><strong>🔗 Meeting:</strong> <a href="{meeting_link}">Link zum Meeting</a></p>'
        if applicant_message and applicant_message.strip():
            location_info += (
                '<div style="background:#eff6ff;padding:14px;border-radius:8px;margin-top:12px;border-left:4px solid #3b82f6;">'
                '<p style="margin:0;color:#1e40af;"><strong>💬 Nachricht des Bewerbers:</strong></p>'
                f'<p style="margin:6px 0 0 0;color:#1e3a8a;">{_html.escape(applicant_message.strip())}</p></div>'
            )
        
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
        return self.send_email(to_email, subject, html_content, email_type="other")
    
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
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'
        
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
        return self.send_email(to_email, subject, html_content, email_type="application_status")

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
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'
        
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
        return self.send_email(to_email, subject, html_content, email_type="other")

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
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'
        
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
        return self.send_email(to_email, subject, html_content, email_type="other")

    @_safe_email_call
    async def send_password_reset_email(self, to_email: str, reset_token: str, user_name: str = None) -> bool:
        """Sendet Passwort-Reset-Link (async für account.py)"""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'
        
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
                <p>Mit freundlichen Grüßen,<br>Ihr JobOn Team</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="password_reset")
    
    @_safe_email_call
    def send_matching_job_notification(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str,
        location: str,
        match_score: int,
        job_slug: str
    ) -> bool:
        """
        Notifies an applicant about a new matching job posting.
        Email is in English as applicants are international.
        """
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'
        
        job_url = f"{frontend_url}/jobs/{job_slug}"
        
        subject = f"🎯 New Job Match: {job_title} ({match_score}% match)"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🎯 Great News!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">A new job matches your profile</p>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #374151;">Hello {applicant_name},</p>
                
                <p style="color: #4b5563;">We found a new job opportunity that matches your profile!</p>
                
                <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: #065f46;">
                        {job_title}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #047857;">
                        🏢 {company_name}
                    </p>
                    <p style="margin: 0 0 10px 0; color: #047857;">
                        📍 {location}
                    </p>
                    <div style="background: #d1fae5; padding: 10px 15px; border-radius: 20px; display: inline-block; margin-top: 10px;">
                        <span style="color: #065f46; font-weight: bold; font-size: 18px;">
                            {match_score}% Match
                        </span>
                    </div>
                </div>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{job_url}" 
                       style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        View Job Details →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Best regards,<br>
                    <strong>Your JobOn Team</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="job_match")

    def send_boost_job_notification(
        self,
        to_email: str,
        applicant_name: str,
        job_title: str,
        company_name: str,
        location: str,
        job_slug: str,
        match_score: int = 0,
    ) -> bool:
        """
        Boost email: promotes a single (boosted) job to an applicant – styled like
        the matching-job notification (with match score + direct link). English.
        Independent from the automatic new-job notification.
        """
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except Exception:
            frontend_url = 'https://www.jobon.work'
        if not frontend_url or 'localhost' in frontend_url:
            frontend_url = 'https://www.jobon.work'

        job_url = f"{frontend_url}/jobs/{job_slug}"

        # Bewusst KEIN Match-Score in der Bewerber-Mail (kann niedrig wirken).
        subject = f"🚀 A job for you: {job_title}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🚀 A job that fits you!</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Take a look at this opportunity on JobOn</p>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #374151;">Hello {applicant_name},</p>

                <p style="color: #4b5563;">We think this job could be a great match for your profile:</p>

                <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0 0 10px 0; font-size: 20px; font-weight: bold; color: #065f46;">
                        {job_title}
                    </p>
                    <p style="margin: 0 0 5px 0; color: #047857;">
                        🏢 {company_name}
                    </p>
                    <p style="margin: 0; color: #047857;">
                        📍 {location}
                    </p>
                </div>

                <p style="text-align: center; margin: 30px 0;">
                    <a href="{job_url}"
                       style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        View Job &amp; Apply →
                    </a>
                </p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Best regards,<br>
                    <strong>Your JobOn Team</strong>
                </p>

                <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="job_boost")

    @_safe_email_call
    def send_boost_digest(
        self,
        to_email: str,
        applicant_name: str,
        matching_jobs: list
    ) -> bool:
        """Personalisierter Booster-Digest: nur die geboosteten Stellen, für die
        DIESER Bewerber kern-geeignet ist. matching_jobs = [{"job":..., "score":int}]."""
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except Exception:
            frontend_url = 'https://www.jobon.work'

        jobs_html = ""
        for match in matching_jobs:
            job = match["job"]
            job_url = f"{frontend_url}/jobs/{job.slug}-{job.id}" if job.slug else f"{frontend_url}/jobs/{job.id}"
            if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
                company_name = job.external_employer_name
            else:
                company_name = job.company.company_name if job.company else "JobOn"
            jobs_html += f"""
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fff7ed; border-radius:8px; margin:10px 0; border-left:4px solid #f97316;">
                <tr><td style="padding:15px;">
                    <p style="margin:0 0 4px 0; font-size:16px; font-weight:bold; color:#1f2937;">{job.title}</p>
                    <p style="margin:0; color:#6b7280; font-size:14px;">{company_name} &bull; {job.location or 'Deutschland'}</p>
                    <p style="margin:10px 0 0 0;"><a href="{job_url}" style="color:#ea580c; text-decoration:none; font-weight:600;">Jetzt ansehen &rarr;</a></p>
                </td></tr>
            </table>
            """

        subject = f"{len(matching_jobs)} empfohlene Stelle{'n' if len(matching_jobs) != 1 else ''} für dich | JobOn"
        html_content = f"""
        <html><body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; background:#f3f4f6; padding:20px;">
            <div style="background:linear-gradient(135deg,#f97316,#ea580c); color:#fff; padding:28px; text-align:center; border-radius:12px 12px 0 0;">
                <h1 style="margin:0; font-size:22px;">Empfohlene Stellen für dich</h1>
                <p style="margin:8px 0 0 0; font-size:15px;">{len(matching_jobs)} passende Stelle{'n' if len(matching_jobs) != 1 else ''} – handverlesen</p>
            </div>
            <div style="padding:28px; background:#ffffff; border-radius:0 0 12px 12px;">
                <p style="font-size:16px; color:#374151;">Hallo {applicant_name},</p>
                <p style="color:#4b5563;">diese aktuell hervorgehobenen Stellen passen zu deinem Profil:</p>
                {jobs_html}
                <p style="text-align:center; margin:24px 0 0 0;">
                    <a href="{frontend_url}/jobs" style="background:#f97316; color:#fff; padding:12px 26px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">Alle Stellen ansehen</a>
                </p>
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:24px 0;">
                <p style="color:#9ca3af; font-size:12px;">Du erhältst diese E-Mail, weil du Job-Benachrichtigungen aktiviert hast. Abmelden im Profil.</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="job_match")

    def send_weekly_job_digest(
        self,
        to_email: str,
        applicant_name: str,
        matching_jobs: list
    ) -> bool:
        """
        Sends a weekly digest of matching jobs to an applicant.
        Email is in English as applicants are international.
        """
        try:
            from app.core.config import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        except:
            frontend_url = 'https://www.jobon.work'
        
        # Build job list HTML
        jobs_html = ""
        for match in matching_jobs[:10]:  # Max 10 jobs
            job = match["job"]
            score = match["score"]
            job_url = f"{frontend_url}/jobs/{job.slug}-{job.id}" if job.slug else f"{frontend_url}/jobs/{job.id}"
            # Bei externen (gescrapten) Jobs den echten Arbeitgeber zeigen, nicht die System-Firma
            if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
                company_name = job.external_employer_name
            else:
                company_name = job.company.company_name if job.company else "Unknown"
            
            jobs_html += f"""
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f9fafb; border-radius: 8px; margin: 10px 0; border-left: 4px solid #10b981;">
                <tr>
                    <td style="padding: 15px;">
                        <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                                <td style="vertical-align: top;">
                                    <p style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #1f2937;">
                                        {job.title}
                                    </p>
                                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                                        {company_name} &bull; {job.location or 'Germany'}
                                    </p>
                                </td>
                                <td style="vertical-align: top; text-align: right; width: 60px;">
                                    <span style="background: #d1fae5; color: #065f46; padding: 5px 12px; border-radius: 15px; font-weight: bold; font-size: 14px; display: inline-block;">
                                        {score}%
                                    </span>
                                </td>
                            </tr>
                        </table>
                        <p style="margin: 10px 0 0 0;">
                            <a href="{job_url}" style="color: #10b981; text-decoration: none; font-weight: 500;">
                                View Details &rarr;
                            </a>
                        </p>
                    </td>
                </tr>
            </table>
            """
        
        subject = f"Your Weekly Job Digest - {len(matching_jobs)} Matching Jobs | JobOn"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f3f4f6; padding: 20px;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">Your Weekly Job Digest</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">{len(matching_jobs)} jobs match your profile</p>
            </div>
            <div style="padding: 30px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 16px; color: #374151;">Hello {applicant_name},</p>
                
                <p style="color: #4b5563;">Here are the latest job opportunities that match your profile:</p>
                
                {jobs_html}
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}/jobs" 
                       style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                        Browse All Jobs →
                    </a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <p style="color: #6b7280; font-size: 14px; margin: 0;">
                    Best regards,<br>
                    <strong>Your JobOn Team</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin<br><br>
                    <em>You receive this email because you have an active profile on JobOn.work</em>
                </p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="job_digest")


    @_safe_email_call
    def send_sales_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        is_html: bool = True
    ) -> bool:
        """
        Sendet eine Kaltakquise/Vertriebs-E-Mail.
        Verwendet business@jobon.work als Absender.
        Unterstützt HTML und Volltext-Modus.
        """
        if is_html:
            # HTML-Modus: Wrapper mit professionellem Layout
            full_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
                <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="padding: 30px;">
                        {html_content}
                    </div>
                    <div style="background: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #6b7280; font-size: 12px; margin: 0;">
                            IJP International Job Placement UG (haftungsbeschränkt)<br>
                            Husemannstr. 9, 10435 Berlin<br>
                            <a href="https://www.jobon.work" style="color: #2563eb;">www.jobon.work</a>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
        else:
            # Volltext-Modus: Konvertiere zu einfachem HTML mit Zeilenumbrüchen
            # Ersetze Zeilenumbrüche durch <br> und füge minimales Styling hinzu
            text_as_html = html_content.replace('\n', '<br>\n')
            full_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="line-height: 1.6; color: #333;">
                    {text_as_html}
                </div>
                <br><br>
                <div style="color: #666; font-size: 12px; border-top: 1px solid #eee; padding-top: 15px;">
                    IJP International Job Placement UG (haftungsbeschränkt)<br>
                    Husemannstr. 9, 10435 Berlin<br>
                    www.jobon.work
                </div>
            </body>
            </html>
            """
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=full_html,
            email_type="sales",
            from_email="business@jobon.work",
            from_name="JobOn - International Job Placement"
        )


    @_safe_email_call
    def send_company_weekly_report(
        self,
        to_email: str,
        company_name: str,
        open_count: int,
        jobs_stats: List[dict],
    ) -> bool:
        """Wöchentlicher Stellen-Report an eine Firma (immer Deutsch).
        jobs_stats: Liste von {title, clicks, applications, likes}."""
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        total_clicks = sum(int(j.get('clicks', 0) or 0) for j in jobs_stats)
        total_apps = sum(int(j.get('applications', 0) or 0) for j in jobs_stats)
        total_likes = sum(int(j.get('likes', 0) or 0) for j in jobs_stats)

        rows = ""
        for j in jobs_stats:
            rows += f"""
            <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;"><strong>{j.get('title','-')}</strong></td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{int(j.get('clicks',0) or 0)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{int(j.get('applications',0) or 0)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{int(j.get('likes',0) or 0)}</td>
            </tr>
            """
        if not rows:
            rows = '<tr><td colspan="4" style="padding:16px;text-align:center;color:#6b7280;">Aktuell keine aktiven Stellen.</td></tr>'

        subject = f"📊 Wochen-Report: {open_count} offene Stelle(n) – {company_name}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background:#f9fafb;">
            <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:26px;border-radius:12px 12px 0 0;">
                <h1 style="margin:0;font-size:22px;">Ihr Wochen-Report</h1>
                <p style="margin:6px 0 0 0;opacity:.9;">{company_name}</p>
            </div>
            <div style="padding:24px;background:#fff;">
                <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px;">
                    <div style="flex:1;min-width:120px;background:#eff6ff;border-radius:10px;padding:14px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;color:#1d4ed8;">{open_count}</div>
                        <div style="font-size:12px;color:#3b82f6;">offene Stellen</div>
                    </div>
                    <div style="flex:1;min-width:120px;background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;color:#16a34a;">{total_apps}</div>
                        <div style="font-size:12px;color:#22c55e;">Bewerbungen</div>
                    </div>
                    <div style="flex:1;min-width:120px;background:#fef9c3;border-radius:10px;padding:14px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;color:#ca8a04;">{total_clicks}</div>
                        <div style="font-size:12px;color:#eab308;">Aufrufe</div>
                    </div>
                    <div style="flex:1;min-width:120px;background:#fdf2f8;border-radius:10px;padding:14px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;color:#db2777;">{total_likes}</div>
                        <div style="font-size:12px;color:#ec4899;">Merkungen</div>
                    </div>
                </div>
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr style="background:#f3f4f6;text-align:left;">
                            <th style="padding:10px 12px;">Stelle</th>
                            <th style="padding:10px 12px;text-align:center;">Aufrufe</th>
                            <th style="padding:10px 12px;text-align:center;">Bewerbungen</th>
                            <th style="padding:10px 12px;text-align:center;">Merkungen</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
                <div style="text-align:center;margin-top:24px;">
                    <a href="{frontend_url}/company/dashboard" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">Zum Dashboard</a>
                </div>
                <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Sie erhalten diese Wochen-Übersicht, weil sie in Ihren Einstellungen aktiviert ist. Sie können sie jederzeit unter „Einstellungen" deaktivieren.</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="company_weekly_report")

    @_safe_email_call
    def send_company_expiry_reminder(
        self,
        to_email: str,
        company_name: str,
        jobs: List[dict],
    ) -> bool:
        """Erinnerung, dass Stellen bald ablaufen (immer Deutsch).
        jobs: Liste von {title, deadline, days_left, job_id}."""
        if not jobs:
            return True
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://www.jobon.work')
        rows = ""
        for j in jobs:
            rows += f"""
            <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;"><strong>{j.get('title','-')}</strong></td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;">{j.get('deadline','-')}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;color:#dc2626;font-weight:bold;">in {j.get('days_left','?')} Tag(en)</td>
            </tr>
            """
        plural = "Stellen laufen" if len(jobs) > 1 else "Stelle läuft"
        subject = f"⏰ {len(jobs)} {plural} bald ab – {company_name}"
        html_content = f"""
        <html><body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background:#f9fafb;">
            <div style="background:#f59e0b;color:#fff;padding:26px;border-radius:12px 12px 0 0;">
                <h1 style="margin:0;font-size:22px;">⏰ Stellen laufen bald ab</h1>
                <p style="margin:6px 0 0 0;opacity:.95;">{company_name}</p>
            </div>
            <div style="padding:24px;background:#fff;">
                <p>folgende Stelle(n) erreichen bald ihren Bewerbungsschluss. Bitte verlängern Sie die Frist, falls Sie weiter Bewerbungen erhalten möchten:</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px;">
                    <thead>
                        <tr style="background:#f3f4f6;text-align:left;">
                            <th style="padding:10px 12px;">Stelle</th>
                            <th style="padding:10px 12px;text-align:center;">Bewerbungsschluss</th>
                            <th style="padding:10px 12px;text-align:center;">Läuft ab</th>
                        </tr>
                    </thead>
                    <tbody>{rows}</tbody>
                </table>
                <div style="text-align:center;margin-top:24px;">
                    <a href="{frontend_url}/company/jobs" style="background:#f59e0b;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">Stellen verwalten</a>
                </div>
                <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Sie erhalten diese Erinnerung, weil sie in Ihren Einstellungen aktiviert ist. Sie können sie jederzeit unter „Einstellungen" deaktivieren.</p>
            </div>
        </body></html>
        """
        return self.send_email(to_email, subject, html_content, email_type="company_expiry_reminder")

    @_safe_email_call
    def send_company_applicant_digest(
        self,
        to_email: str,
        company_name: str,
        applicants_data: List[dict]
    ) -> bool:
        """
        Sendet eine tägliche Übersicht neuer Bewerber an eine Firma.
        applicants_data: Liste von {name, job_title, matching_score, applied_at, application_id}
        """
        if not applicants_data:
            return True  # Keine Bewerber = keine E-Mail nötig
        
        # Sortiere nach Matching Score (höchster zuerst)
        sorted_applicants = sorted(applicants_data, key=lambda x: x.get('matching_score', 0), reverse=True)
        
        # Bewerber-Tabelle erstellen
        applicant_rows = ""
        for app in sorted_applicants:
            score = app.get('matching_score', 0)
            score_color = "#22c55e" if score >= 80 else "#f59e0b" if score >= 60 else "#6b7280"
            applicant_rows += f"""
            <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    <strong>{app.get('name', 'Unbekannt')}</strong>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    {app.get('job_title', '-')}
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                    <span style="background: {score_color}; color: white; padding: 4px 12px; border-radius: 20px; font-weight: bold;">
                        {score}%
                    </span>
                </td>
                <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
                    {app.get('applied_at', '-')}
                </td>
            </tr>
            """
        
        subject = f"📋 {len(applicants_data)} neue Bewerber für {company_name}"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f9fafb;">
            <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; text-align: center;">
                <h1 style="margin: 0;">Neue Bewerber-Übersicht</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Täglicher Digest für {company_name}</p>
            </div>
            
            <div style="padding: 30px; background: white;">
                <p style="color: #374151; font-size: 16px;">
                    Sie haben <strong>{len(applicants_data)} neue Bewerbung(en)</strong> erhalten.
                    Die Bewerber sind nach Matching-Score sortiert.
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <thead>
                        <tr style="background: #f3f4f6;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Bewerber</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Stelle</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Match</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Datum</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applicant_rows}
                    </tbody>
                </table>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="https://jobon.work/company/applications" 
                       style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Alle Bewerbungen ansehen →
                    </a>
                </div>
            </div>
            
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 10px 0;">
                    Sie erhalten diese E-Mail, weil Sie den Bewerber-Digest aktiviert haben.
                </p>
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    <a href="https://jobon.work/company/settings" style="color: #2563eb;">E-Mail-Einstellungen ändern</a>
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            email_type="company_digest"
        )


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
