"""
Übersetzungen für Bewerber-E-Mails (de/en/es/ru).

Firmen-E-Mails bleiben immer Deutsch – diese Übersetzungen gelten nur für
Bewerber-gerichtete Mails, abhängig von user.preferred_language.

Nutzung:
    from app.services.email_i18n import et, normalize_lang
    et(lang, "welcome_subject")
    et(lang, "greeting", name="Max")
"""

SUPPORTED = ("de", "en", "es", "ru")


def normalize_lang(lang: str | None) -> str:
    l = (lang or "de").lower().strip()[:2]
    return l if l in SUPPORTED else "de"


EMAIL_I18N = {
    "de": {
        "regards": "Mit freundlichen Grüßen,<br>Ihr JobOn Team",
        "greeting": "Hallo {name},",
        # Willkommen
        "welcome_subject": "Willkommen beim IJP Portal!",
        "welcome_h1": "Willkommen beim IJP Portal!",
        "welcome_p1": "vielen Dank für Ihre Registrierung bei <strong>International Job Placement</strong>!",
        "welcome_p2": "Wir freuen uns, Sie bei der Suche nach Ihrem Traumjob zu unterstützen.",
        # Bewerbung eingegangen
        "received_subject": "Bewerbung eingegangen: {job}",
        "received_h1": "✅ Bewerbung erfolgreich!",
        "received_p1": "Ihre Bewerbung für <strong>{job}</strong> bei <strong>{company}</strong> wurde erfolgreich eingereicht.",
        "received_p2": "Wir drücken Ihnen die Daumen!",
        # Status-Update
        "status_subject": "Bewerbungsstatus aktualisiert: {job}",
        "status_h1": "📋 Status aktualisiert",
        "status_intro": "Der Status Ihrer Bewerbung bei <strong>{company}</strong> für <strong>{job}</strong> wurde aktualisiert:",
        # Status-Namen
        "st_pending": "Eingegangen",
        "st_company_review": "In Prüfung beim Unternehmen",
        "st_interview_proposed": "Vorstellungsgespräch vorgeschlagen",
        "st_interview_scheduled": "Vorstellungsgespräch bestätigt",
        "st_interview_completed": "Vorstellungsgespräch abgeschlossen",
        "st_accepted": "Angenommen ✅",
        "st_rejected": "Leider abgelehnt",
        "st_withdrawn": "Zurückgezogen",
    },
    "en": {
        "regards": "Best regards,<br>Your JobOn Team",
        "greeting": "Hello {name},",
        "welcome_subject": "Welcome to the IJP Portal!",
        "welcome_h1": "Welcome to the IJP Portal!",
        "welcome_p1": "thank you for registering with <strong>International Job Placement</strong>!",
        "welcome_p2": "We look forward to supporting you in finding your dream job.",
        "received_subject": "Application received: {job}",
        "received_h1": "✅ Application submitted!",
        "received_p1": "Your application for <strong>{job}</strong> at <strong>{company}</strong> has been submitted successfully.",
        "received_p2": "We wish you the best of luck!",
        "status_subject": "Application status updated: {job}",
        "status_h1": "📋 Status updated",
        "status_intro": "The status of your application at <strong>{company}</strong> for <strong>{job}</strong> has been updated:",
        "st_pending": "Received",
        "st_company_review": "Under review by the company",
        "st_interview_proposed": "Interview proposed",
        "st_interview_scheduled": "Interview confirmed",
        "st_interview_completed": "Interview completed",
        "st_accepted": "Accepted ✅",
        "st_rejected": "Unfortunately rejected",
        "st_withdrawn": "Withdrawn",
    },
    "es": {
        "regards": "Un cordial saludo,<br>Su equipo de JobOn",
        "greeting": "Hola {name}:",
        "welcome_subject": "¡Bienvenido/a al portal IJP!",
        "welcome_h1": "¡Bienvenido/a al portal IJP!",
        "welcome_p1": "¡gracias por registrarse en <strong>International Job Placement</strong>!",
        "welcome_p2": "Nos alegra poder ayudarle a encontrar el trabajo de sus sueños.",
        "received_subject": "Solicitud recibida: {job}",
        "received_h1": "✅ ¡Solicitud enviada!",
        "received_p1": "Su solicitud para <strong>{job}</strong> en <strong>{company}</strong> se ha enviado correctamente.",
        "received_p2": "¡Le deseamos mucha suerte!",
        "status_subject": "Estado de la solicitud actualizado: {job}",
        "status_h1": "📋 Estado actualizado",
        "status_intro": "El estado de su solicitud en <strong>{company}</strong> para <strong>{job}</strong> se ha actualizado:",
        "st_pending": "Recibida",
        "st_company_review": "En revisión por la empresa",
        "st_interview_proposed": "Entrevista propuesta",
        "st_interview_scheduled": "Entrevista confirmada",
        "st_interview_completed": "Entrevista finalizada",
        "st_accepted": "Aceptada ✅",
        "st_rejected": "Lamentablemente rechazada",
        "st_withdrawn": "Retirada",
    },
    "ru": {
        "regards": "С уважением,<br>Ваша команда JobOn",
        "greeting": "Здравствуйте, {name}!",
        "welcome_subject": "Добро пожаловать на портал IJP!",
        "welcome_h1": "Добро пожаловать на портал IJP!",
        "welcome_p1": "спасибо за регистрацию в <strong>International Job Placement</strong>!",
        "welcome_p2": "Мы рады помочь вам найти работу вашей мечты.",
        "received_subject": "Заявка получена: {job}",
        "received_h1": "✅ Заявка отправлена!",
        "received_p1": "Ваша заявка на <strong>{job}</strong> в <strong>{company}</strong> успешно отправлена.",
        "received_p2": "Желаем удачи!",
        "status_subject": "Статус заявки обновлён: {job}",
        "status_h1": "📋 Статус обновлён",
        "status_intro": "Статус вашей заявки в <strong>{company}</strong> на <strong>{job}</strong> обновлён:",
        "st_pending": "Получена",
        "st_company_review": "На рассмотрении у компании",
        "st_interview_proposed": "Предложено собеседование",
        "st_interview_scheduled": "Собеседование подтверждено",
        "st_interview_completed": "Собеседование завершено",
        "st_accepted": "Принята ✅",
        "st_rejected": "К сожалению, отклонена",
        "st_withdrawn": "Отозвана",
    },
}


def et(lang: str | None, key: str, **kwargs) -> str:
    """Übersetzten Text holen (mit Fallback auf Deutsch) und optional formatieren."""
    l = normalize_lang(lang)
    table = EMAIL_I18N.get(l, EMAIL_I18N["de"])
    text = table.get(key) or EMAIL_I18N["de"].get(key) or key
    return text.format(**kwargs) if kwargs else text


def status_label(lang: str | None, status: str) -> str:
    """Lokalisierter Bewerbungsstatus-Name."""
    return et(lang, f"st_{status}") if EMAIL_I18N["de"].get(f"st_{status}") else status
