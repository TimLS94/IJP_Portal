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
from app.services.matching_service import calculate_match_score
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

    # Get all active applicants
    applicants = db.query(Applicant).join(
        User, Applicant.user_id == User.id
    ).filter(
        User.is_active == True
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


def send_boost_emails_for_job(job: JobPosting, db: Session) -> dict:
    """Versendet die eigenständige Boost-E-Mail (manuell ausgelöst) an passende Bewerber.

    Unabhängig von der "Neue Stelle"-Benachrichtigung. Nutzt denselben
    Stellenart-Gruppen-Filter + Match-Schwelle und respektiert email_job_alerts.
    """
    from app.services.email_service import email_service

    if not job.is_active or getattr(job, "is_draft", False):
        return {"matched": 0, "sent": 0, "error": "Stelle ist inaktiv/Entwurf"}

    threshold = get_setting(db, "job_notifications_threshold", 85)
    matching = get_matching_applicants(job, db, threshold)

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
    
    # Get all active applicants
    try:
        applicants = db.query(Applicant).join(
            User, Applicant.user_id == User.id
        ).filter(
            User.is_active == True
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
