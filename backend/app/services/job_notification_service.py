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
    
    # Get all active applicants
    applicants = db.query(Applicant).join(User).filter(
        User.is_active == True
    ).all()
    
    for applicant in applicants:
        try:
            match_result = calculate_match_score(applicant, job)
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
    Sends email notifications to all matching applicants about a new job.
    
    Args:
        job: The newly created/activated job posting
        db: Database session
    
    Returns:
        Number of emails sent
    """
    from app.services.email_service import email_service
    
    # Check if notifications are enabled
    notifications_enabled = get_setting(db, "job_notifications_enabled", True)
    if not notifications_enabled:
        logger.info("Job notifications are disabled in settings")
        return 0
    
    # Check if instant notifications are enabled
    instant_enabled = get_setting(db, "instant_job_notifications_enabled", True)
    if not instant_enabled:
        logger.info("Instant job notifications are disabled - skipping")
        return 0
    
    # Get threshold from settings
    threshold = get_setting(db, "job_notifications_threshold", 85)
    
    # Find matching applicants
    matching = get_matching_applicants(job, db, threshold)
    
    if not matching:
        logger.info(f"No matching applicants found for job {job.id} (threshold: {threshold})")
        return 0
    
    logger.info(f"Found {len(matching)} matching applicants for job {job.id}")
    
    emails_sent = 0
    for match in matching:
        applicant = match["applicant"]
        score = match["score"]
        
        # Get user email
        user = db.query(User).filter(User.id == applicant.user_id).first()
        if not user or not user.email:
            continue
        
        try:
            success = email_service.send_matching_job_notification(
                to_email=user.email,
                applicant_name=f"{applicant.first_name} {applicant.last_name}",
                job_title=job.title,
                company_name=job.company.company_name if job.company else "Unknown",
                location=job.location or "Germany",
                match_score=score,
                job_slug=job.url_slug or str(job.id)
            )
            if success:
                emails_sent += 1
        except Exception as e:
            logger.error(f"Failed to send notification to {user.email}: {e}")
    
    logger.info(f"Sent {emails_sent} job notification emails for job {job.id}")
    return emails_sent


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
    
    # Get active jobs from the last N days
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    jobs = db.query(JobPosting).filter(
        JobPosting.is_active == True,
        JobPosting.created_at >= cutoff_date
    ).all()
    
    for job in jobs:
        try:
            match_result = calculate_match_score(applicant, job)
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
    
    # Get all active applicants
    applicants = db.query(Applicant).join(User).filter(
        User.is_active == True
    ).all()
    
    emails_sent = 0
    
    for applicant in applicants:
        user = db.query(User).filter(User.id == applicant.user_id).first()
        if not user or not user.email:
            continue
        
        # Find matching jobs from the last 7 days
        matching_jobs = get_matching_jobs_for_applicant(applicant, db, threshold, days=7)
        
        if not matching_jobs:
            continue
        
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
    
    logger.info(f"Sent {emails_sent} weekly digest emails")
    return emails_sent
