"""
Job Notification Service

Sends email notifications to applicants when matching jobs are posted.
Also handles weekly digest emails.
"""
import logging
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.models.applicant import Applicant
from app.models.job_posting import JobPosting
from app.models.user import User
from app.services.matching_service import calculate_match_score, is_core_fit
from app.services.settings_service import get_setting
from app.services.position_groups import get_applicant_position_types, position_compatible

logger = logging.getLogger(__name__)


def get_matching_applicants(job: JobPosting, db: Session, threshold: int = 85) -> List[Applicant]:
    """
    Finds all applicants whose profile matches the job above the threshold.
    
    Args:
        job: The job posting to match against
        db: Database session
        threshold: Minimum match score (default 85)
    
    Returns:
        List of matching applicants
    """
    matching_applicants = []

    job_type = job.position_type.value if job.position_type else None

    # Get all active applicants (IJP-Unterportal ausgeschlossen – die bekommen keine JobOn-Alerts)
    applicants = db.query(Applicant).join(
        User, Applicant.user_id == User.id
    ).filter(
        User.is_active == True,
        Applicant.portal != "ijp"
    ).all()

    for applicant in applicants:
        # Harter Filter: nur kompatible Stellenarten (Gruppen-Logik)
        if not position_compatible(get_applicant_position_types(applicant), job_type):
            continue
        try:
            match_result = calculate_match_score(applicant, job, db=db)
            if match_result.get("total_score", 0) >= threshold:
                matching_applicants.append({
                    "applicant": applicant,
                    "score": match_result["total_score"],
                    "details": match_result.get("details", [])
                })
        except Exception as e:
            logger.warning(f"Error calculating match for applicant {applicant.id}: {e}")
            continue
    
    # Sort by score descending
    matching_applicants.sort(key=lambda x: x["score"], reverse=True)
    
    return matching_applicants


def notify_applicants_about_new_job(job: JobPosting, db: Session) -> int:
    """
    Sends email notifications and creates in-app notifications for all matching applicants about a new job.
    
    Args:
        job: The newly created/activated job posting
        db: Database session
    
    Returns:
        Number of notifications sent
    """
    # Sicherheitscheck: Niemals für inaktive oder Entwurf-Jobs benachrichtigen
    if not job.is_active or getattr(job, "is_draft", False):
        logger.info(f"Job {job.id} ist inaktiv/Entwurf — keine Benachrichtigung")
        return 0

    # Hinweis: Der Telegram-Broadcast läuft NICHT mehr sofort hier, sondern verzögert
    # (~5 Min) über den Background-Task telegram_post_pending_jobs() – nur für
    # ausreichend ausgefüllte Stellen. Schützt vor Spam bei versehentlichen Posts.

    from app.services.email_service import email_service
    from app.models.notification import Notification

    # Check if notifications are enabled
    notifications_enabled = get_setting(db, "job_notifications_enabled", True)
    if not notifications_enabled:
        logger.info("Job notifications are disabled in settings")
        return 0
    
    # Get threshold from settings
    threshold = get_setting(db, "job_notifications_threshold", 85)
    
    # Find matching applicants
    matching = get_matching_applicants(job, db, threshold)
    
    if not matching:
        logger.info(f"No matching applicants found for job {job.id} (threshold: {threshold})")
        return 0
    
    logger.info(f"Found {len(matching)} matching applicants for job {job.id}")

    # Bei externen (gescrapten) Jobs den echten Arbeitgeber zeigen, nicht die System-Firma
    if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
        employer_name = job.external_employer_name
    else:
        employer_name = job.company.company_name if job.company else "Unbekannt"

    notifications_created = 0
    emails_sent = 0
    
    for match in matching:
        applicant = match["applicant"]
        score = match["score"]
        
        # Get user
        user = db.query(User).filter(User.id == applicant.user_id).first()
        if not user:
            continue
        
        # Create in-app notification
        try:
            import json as _json
            company_name = employer_name
            notification = Notification(
                user_id=user.id,
                type="new_job",
                reference_id=job.id,
                reference_type="job",
                title=f"Neue passende Stelle: {job.title}",
                message=f"{company_name} in {job.location or 'Deutschland'} - {score}% Match",
                notification_key="notifications.newJob",
                notification_params=_json.dumps({"jobTitle": job.title, "company": company_name, "location": job.location or "Deutschland", "score": str(score)})
            )
            db.add(notification)
            notifications_created += 1
        except Exception as e:
            logger.error(f"Failed to create notification for user {user.id}: {e}")
        
        # Send email notification (if instant notifications enabled UND Bewerber hat Jobalert-Mails aktiv)
        instant_enabled = get_setting(db, "instant_job_notifications_enabled", True)
        wants_emails = user.email_job_alerts if user.email_job_alerts is not None else True
        if instant_enabled and wants_emails and user.email:
            try:
                success = email_service.send_matching_job_notification(
                    to_email=user.email,
                    applicant_name=f"{applicant.first_name} {applicant.last_name}",
                    job_title=job.title,
                    company_name=employer_name,
                    location=job.location or "Germany",
                    match_score=score,
                    job_slug=f"{job.slug}-{job.id}" if job.slug else str(job.id)
                )
                if success:
                    emails_sent += 1
            except Exception as e:
                logger.error(f"Failed to send notification to {user.email}: {e}")
    
    # Commit all notifications
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to commit notifications: {e}")
        db.rollback()
    
    logger.info(f"Created {notifications_created} in-app notifications and sent {emails_sent} emails for job {job.id}")
    return notifications_created


def get_core_fit_applicants(job: JobPosting, db: Session) -> List[dict]:
    """Bewerber mit KERN-EIGNUNG für den Booster: erfüllen die echten Anforderungen
    (Stellenart + Pflicht-Sprachen + Arbeitsberechtigung), unabhängig von Profil-
    Vollständigkeit (Erfahrung/Text-Match). Der Match-Score wird trotzdem berechnet –
    nur für die Anzeige in der E-Mail und die Sortierung, NICHT als Filter."""
    applicants = db.query(Applicant).join(
        User, Applicant.user_id == User.id
    ).filter(
        User.is_active == True,
        Applicant.portal != "ijp"
    ).all()

    result = []
    for applicant in applicants:
        if not is_core_fit(applicant, job, db):
            continue
        score = 0
        try:
            score = calculate_match_score(applicant, job, db=db).get("total_score", 0)
        except Exception:
            score = 0
        result.append({"applicant": applicant, "score": score})

    result.sort(key=lambda x: x["score"], reverse=True)
    return result


def _currently_boosted_jobs(db: Session) -> List[JobPosting]:
    """Aktuell geboostete/hervorgehobene aktive Stellen (wie in der Boost-Übersicht)."""
    from sqlalchemy import or_ as _or
    now = datetime.utcnow()
    boost_cutoff = now - timedelta(days=30)
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_draft == False,
        JobPosting.is_archived == False,
        _or(JobPosting.is_featured == True, JobPosting.last_boosted_at >= boost_cutoff),
    ).all()
    result = []
    for j in jobs:
        recent_boost = j.last_boosted_at and j.last_boosted_at.replace(tzinfo=None) >= boost_cutoff
        featured_active = j.is_featured and (not j.featured_until or j.featured_until.replace(tzinfo=None) > now)
        if recent_boost or featured_active:
            result.append(j)
    return result


def _digest_jobs_for_applicant(applicant: Applicant, boosted_jobs: List[JobPosting], db: Session, cap: int = 8) -> List[dict]:
    """Kern-geeignete Booster-Jobs für EINEN Bewerber: nach Score sortiert, max 1 pro
    Arbeitgeber, auf cap gedeckelt. Leere Liste = keine passende Stelle."""
    scored = []
    for job in boosted_jobs:
        if not is_core_fit(applicant, job, db):
            continue
        try:
            score = calculate_match_score(applicant, job, db=db).get("total_score", 0)
        except Exception:
            score = 0
        scored.append((score, job))
    scored.sort(key=lambda x: x[0], reverse=True)

    seen_employers = set()
    out = []
    for score, job in scored:
        if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
            key = ("ext", job.external_employer_name)
        else:
            key = ("co", job.company_id or job.id)
        if key in seen_employers:
            continue
        seen_employers.add(key)
        out.append({"job": job, "score": score})
        if len(out) >= cap:
            break
    return out


def send_boost_digest_to_applicants(db: Session, cap: int = 8) -> dict:
    """Personalisierter Booster-Digest: jeder aktive Bewerber mit Alerts bekommt EINE
    Mail mit den geboosteten Stellen, für die er kern-geeignet ist. Wer zu keiner
    passt, bekommt nichts (kein Spam)."""
    from app.services.email_service import email_service
    boosted = _currently_boosted_jobs(db)
    if not boosted:
        return {"boosted_jobs": 0, "recipients": 0, "sent": 0}

    applicants = db.query(Applicant).join(User, Applicant.user_id == User.id).filter(
        User.is_active == True, Applicant.portal != "ijp"
    ).all()

    sent = 0
    recipients = 0
    for applicant in applicants:
        user = applicant.user
        if not user or not user.email or user.email_job_alerts is False:
            continue
        jobs = _digest_jobs_for_applicant(applicant, boosted, db, cap=cap)
        if not jobs:
            continue
        recipients += 1
        try:
            if email_service.send_boost_digest(user.email, f"{applicant.first_name} {applicant.last_name}", jobs):
                sent += 1
        except Exception as e:
            logger.error(f"Boost-Digest an {user.email} fehlgeschlagen: {e}")
    return {"boosted_jobs": len(boosted), "recipients": recipients, "sent": sent}


def get_boost_digest_preview(db: Session, cap: int = 8) -> dict:
    """Vorschau (sendet nichts): wie viele Bewerber bekämen den Digest und wie viele
    Jobs im Schnitt."""
    boosted = _currently_boosted_jobs(db)
    applicants = db.query(Applicant).join(User, Applicant.user_id == User.id).filter(
        User.is_active == True, Applicant.portal != "ijp"
    ).all()
    recipients = 0
    total_jobs = 0
    for applicant in applicants:
        user = applicant.user
        if not user or not user.email or user.email_job_alerts is False:
            continue
        jobs = _digest_jobs_for_applicant(applicant, boosted, db, cap=cap)
        if jobs:
            recipients += 1
            total_jobs += len(jobs)
    return {
        "boosted_jobs": len(boosted),
        "recipients": recipients,
        "avg_jobs": round(total_jobs / recipients, 1) if recipients else 0,
    }


def send_boost_emails_for_job(job: JobPosting, db: Session) -> dict:
    """Versendet die eigenständige Boost-E-Mail (manuell ausgelöst) an passende Bewerber.

    Zielt auf KERN-EIGNUNG (Stellenart + Pflicht-Sprachen + Arbeitsberechtigung),
    NICHT auf den vollen Qualitäts-Score – der Booster ist Reichweite, kein Ranking.
    Respektiert email_job_alerts.
    """
    from app.services.email_service import email_service

    if not job.is_active or getattr(job, "is_draft", False):
        return {"matched": 0, "sent": 0, "error": "Stelle ist inaktiv/Entwurf"}

    matching = get_core_fit_applicants(job, db)

    # Echten Arbeitgeber bei externen Stellen verwenden
    if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
        employer_name = job.external_employer_name
    else:
        employer_name = job.company.company_name if job.company else "Unbekannt"

    job_slug = f"{job.slug}-{job.id}" if job.slug else str(job.id)
    sent = 0
    for match in matching:
        applicant = match["applicant"]
        score = match.get("score", 0)
        user = db.query(User).filter(User.id == applicant.user_id).first()
        if not user or not user.email:
            continue
        # Consent: nur Bewerber mit aktiven Jobalert-Mails
        if user.email_job_alerts is False:
            continue
        try:
            ok = email_service.send_boost_job_notification(
                to_email=user.email,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=job.title,
                company_name=employer_name,
                location=job.location or "Germany",
                job_slug=job_slug,
                match_score=score,
            )
            if ok:
                sent += 1
        except Exception as e:
            logger.error(f"Boost-Mail an {user.email} fehlgeschlagen: {e}")

    logger.info(f"Boost-Mails für Job {job.id}: {sent} von {len(matching)} passenden Bewerbern")
    return {"matched": len(matching), "sent": sent}


def get_boost_recipients_breakdown(job: JobPosting, db: Session) -> dict:
    """Zeigt den Empfänger-Trichter für den Boost-Versand einer Stelle:
    aktive Bewerber -> Stellenart passt -> Kern-Eignung (Pflicht-Sprachen +
    Arbeitsberechtigung) -> mit E-Mail & Alerts an.
    Dient der Transparenz ("warum nur X E-Mails?"), sendet nichts.
    """
    job_type = job.position_type.value if job.position_type else None
    applicants = db.query(Applicant).join(
        User, Applicant.user_id == User.id
    ).filter(
        User.is_active == True,
        Applicant.portal != "ijp"
    ).all()

    total_active = len(applicants)
    position_ok = 0
    core_ok = 0
    recipients = 0
    for applicant in applicants:
        if not position_compatible(get_applicant_position_types(applicant), job_type):
            continue
        position_ok += 1
        if not is_core_fit(applicant, job, db):
            continue
        core_ok += 1
        user = applicant.user
        if user and user.email and user.email_job_alerts is not False:
            recipients += 1

    return {
        "job_id": job.id,
        "total_active": total_active,
        "position_compatible": position_ok,
        "core_fit": core_ok,
        "recipients": recipients,
        # Wo Bewerber herausfallen (für die Anzeige):
        "dropped_position": total_active - position_ok,
        "dropped_core": position_ok - core_ok,
        "dropped_consent": core_ok - recipients,
    }


def get_matching_jobs_for_applicant(applicant: Applicant, db: Session, threshold: int = 70, days: int = 7) -> List[dict]:
    """
    Finds all active jobs that match an applicant's profile.
    
    Args:
        applicant: The applicant to find jobs for
        db: Database session
        threshold: Minimum match score
        days: Only consider jobs from the last N days
    
    Returns:
        List of matching jobs with scores
    """
    matching_jobs = []

    applicant_types = get_applicant_position_types(applicant)

    # Get active jobs from the last N days
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_draft == False,
        JobPosting.created_at >= cutoff_date
    ).all()

    for job in jobs:
        # Harter Filter: nur kompatible Stellenarten (Gruppen-Logik)
        job_type = job.position_type.value if job.position_type else None
        if not position_compatible(applicant_types, job_type):
            continue
        try:
            match_result = calculate_match_score(applicant, job, db=db)
            if match_result.get("total_score", 0) >= threshold:
                matching_jobs.append({
                    "job": job,
                    "score": match_result["total_score"],
                    "details": match_result.get("details", [])
                })
        except Exception as e:
            logger.warning(f"Error calculating match for job {job.id}: {e}")
            continue
    
    # Sort by score descending
    matching_jobs.sort(key=lambda x: x["score"], reverse=True)
    
    return matching_jobs


def send_weekly_job_digest(db: Session) -> int:
    """
    Sends weekly digest emails to all applicants with their matching jobs.
    
    Args:
        db: Database session
    
    Returns:
        Number of emails sent
    """
    from app.services.email_service import email_service
    
    logger.info("Starting weekly job digest...")
    
    # Check if notifications are enabled
    notifications_enabled = get_setting(db, "job_notifications_enabled", True)
    if not notifications_enabled:
        logger.info("Job notifications are disabled - skipping weekly digest")
        return 0
    
    # Check if weekly digest is enabled
    digest_enabled = get_setting(db, "weekly_digest_enabled", True)
    if not digest_enabled:
        logger.info("Weekly digest is disabled - skipping")
        return 0
    
    threshold = get_setting(db, "job_notifications_threshold", 85)
    logger.info(f"Using threshold: {threshold}%")
    
    # Get all active applicants (IJP-Unterportal ausgeschlossen)
    try:
        applicants = db.query(Applicant).join(
            User, Applicant.user_id == User.id
        ).filter(
            User.is_active == True,
            Applicant.portal != "ijp"
        ).all()
        logger.info(f"Found {len(applicants)} active applicants")
    except Exception as e:
        logger.error(f"Error querying applicants: {e}")
        raise
    
    # Count jobs from last 7 days
    cutoff_date = datetime.utcnow() - timedelta(days=7)
    recent_jobs_count = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.is_draft == False,
        JobPosting.created_at >= cutoff_date
    ).count()
    logger.info(f"Active jobs from last 7 days: {recent_jobs_count}")
    
    emails_sent = 0
    applicants_with_matches = 0
    
    for applicant in applicants:
        user = db.query(User).filter(User.id == applicant.user_id).first()
        if not user or not user.email:
            continue

        # Consent: nur Bewerber mit aktiven Jobalert-Mails
        if user.email_job_alerts is False:
            continue

        # Find matching jobs from the last 7 days
        matching_jobs = get_matching_jobs_for_applicant(applicant, db, threshold, days=7)
        
        if not matching_jobs:
            continue
        
        applicants_with_matches += 1
        
        try:
            success = email_service.send_weekly_job_digest(
                to_email=user.email,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                matching_jobs=matching_jobs
            )
            if success:
                emails_sent += 1
        except Exception as e:
            logger.error(f"Failed to send weekly digest to {user.email}: {e}")
    
    logger.info(f"Applicants with matching jobs: {applicants_with_matches}")
    logger.info(f"Sent {emails_sent} weekly digest emails")
    return emails_sent
