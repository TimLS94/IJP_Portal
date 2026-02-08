"""
Job Notification Service - Benachrichtigt Bewerber über passende neue Stellen

Wird aufgerufen wenn:
- Eine neue Stelle erstellt wird
- Eine bestehende Stelle aktiviert wird
"""
import logging
from sqlalchemy.orm import Session
from typing import List, Dict

from app.models.applicant import Applicant
from app.models.job_posting import JobPosting
from app.services.matching_service import calculate_match_score
from app.services.settings_service import get_setting
from app.services.email_service import email_service

logger = logging.getLogger(__name__)


def notify_matching_applicants(db: Session, job: JobPosting) -> Dict:
    """
    Findet alle passenden Bewerber für eine Stelle und sendet ihnen eine E-Mail.
    
    Args:
        db: Datenbank-Session
        job: Die neue/aktivierte Stelle
        
    Returns:
        Dict mit Statistiken (notified_count, skipped_count, etc.)
    """
    result = {
        "notified_count": 0,
        "skipped_count": 0,
        "disabled_count": 0,
        "below_threshold_count": 0,
        "errors": []
    }
    
    # Prüfe ob Feature aktiviert ist
    if not get_setting(db, "job_notifications_enabled", True):
        logger.info("Job-Benachrichtigungen sind global deaktiviert")
        return result
    
    # Hole Threshold
    threshold = get_setting(db, "job_notifications_threshold", 85)
    
    # Hole alle Bewerber mit aktivierten Benachrichtigungen
    applicants = db.query(Applicant).filter(
        Applicant.job_notifications_enabled == True
    ).all()
    
    if not applicants:
        logger.info("Keine Bewerber mit aktivierten Benachrichtigungen gefunden")
        return result
    
    # Company-Name und Location für E-Mail
    company_name = job.company.company_name if job.company else "Unternehmen"
    location = job.location or "Deutschland"
    
    # Job-URL generieren
    job_slug = f"{job.slug}-{job.id}" if job.slug else str(job.id)
    job_url = f"https://jobon.work/jobs/{job_slug}"
    
    logger.info(f"Prüfe {len(applicants)} Bewerber für Stelle '{job.title}' (Threshold: {threshold}%)")
    
    for applicant in applicants:
        try:
            # Berechne Matching-Score
            match_result = calculate_match_score(applicant, job)
            score = match_result["total_score"]
            
            # Prüfe ob Score >= Threshold
            if score < threshold:
                result["below_threshold_count"] += 1
                continue
            
            # Prüfe ob Bewerber eine E-Mail hat
            if not applicant.user or not applicant.user.email:
                result["skipped_count"] += 1
                continue
            
            # Sende E-Mail
            applicant_name = f"{applicant.first_name} {applicant.last_name}"
            
            success = email_service.send_job_notification(
                to_email=applicant.user.email,
                applicant_name=applicant_name,
                job_title=job.title,
                company_name=company_name,
                location=location,
                match_score=score,
                job_url=job_url
            )
            
            if success:
                result["notified_count"] += 1
                logger.info(f"Benachrichtigung gesendet an {applicant.user.email} (Score: {score}%)")
            else:
                result["errors"].append(f"E-Mail an {applicant.user.email} fehlgeschlagen")
                
        except Exception as e:
            logger.error(f"Fehler bei Bewerber {applicant.id}: {e}")
            result["errors"].append(str(e))
    
    logger.info(f"Job-Benachrichtigungen abgeschlossen: {result['notified_count']} gesendet, "
                f"{result['below_threshold_count']} unter Threshold, {result['skipped_count']} übersprungen")
    
    return result


def notify_matching_applicants_async(db: Session, job_id: int):
    """
    Asynchrone Version - wird im Hintergrund ausgeführt.
    Lädt die Stelle neu aus der DB.
    """
    try:
        job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
        if job and job.is_active:
            return notify_matching_applicants(db, job)
    except Exception as e:
        logger.error(f"Fehler bei async Job-Benachrichtigung: {e}")
    return None
