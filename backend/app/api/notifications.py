"""
Notifications API - Benachrichtigungen für Bewerber
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.models.notification import Notification
from app.api.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _applicant_profile_incomplete(db: Session, user: User) -> bool:
    """True, wenn das Bewerberprofil fuer eine Bewerbung noch unvollstaendig ist.
    Steuert die synthetische 'Profil vervollstaendigen'-Benachrichtigung."""
    if not user or user.role != UserRole.APPLICANT:
        return False
    a = db.query(Applicant).filter(Applicant.user_id == user.id).first()
    if not a:
        return True
    # Pflichtfelder wie beim Bewerben (check_application_requirements):
    # Vorname, Nachname, Geburtsdatum, Nationalitaet, Telefon, Strasse, Stadt, Land
    if not (a.first_name and a.last_name and a.date_of_birth and a.nationality
            and a.phone and a.street and a.city and a.country):
        return True
    # IJP-Studenten: zusaetzliche Pflichtangaben
    if (getattr(a, "portal", "") or "") == "ijp":
        if not a.studying_since:
            return True
        if not (a.university_city and a.university_street):
            return True
    return False


class NotificationResponse(BaseModel):
    id: int
    type: str
    reference_id: Optional[int]
    reference_type: Optional[str]
    title: str
    message: Optional[str]
    notification_key: Optional[str] = None
    notification_params: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    unread_count: int
    total_count: int


@router.get("/count", response_model=NotificationCountResponse)
async def get_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt die Anzahl der ungelesenen Benachrichtigungen zurück"""
    unread = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).scalar() or 0
    
    total = db.query(func.count(Notification.id)).filter(
        Notification.user_id == current_user.id
    ).scalar() or 0

    # Synthetischer "Profil vervollstaendigen"-Hinweis (zaehlt als 1 ungelesen,
    # solange das Profil unvollstaendig ist – verschwindet automatisch danach).
    if _applicant_profile_incomplete(db, current_user):
        unread += 1
        total += 1

    return {"unread_count": unread, "total_count": total}


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt alle Benachrichtigungen des Benutzers zurück"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    # Synthetischer "Profil vervollstaendigen"-Hinweis (oben, nicht in der DB).
    # id=0 kennzeichnet ihn -> das Frontend markiert ihn nicht als gelesen, sondern
    # navigiert nur zum Profil. Text kommt ueber notification_key (mehrsprachig).
    if _applicant_profile_incomplete(db, current_user):
        synthetic = {
            "id": 0,
            "type": "profile_incomplete",
            "reference_id": None,
            "reference_type": "profile",
            "title": "Profil vervollständigen",
            "message": "Vervollständige dein Profil, um dich bewerben zu können.",
            "notification_key": "notifications.profileIncomplete",
            "notification_params": None,
            "is_read": False,
            "created_at": datetime.utcnow(),
        }
        return [synthetic, *notifications]
    return notifications


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Markiert eine Benachrichtigung als gelesen"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Benachrichtigung nicht gefunden")
    
    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.commit()
    
    return {"success": True}


@router.post("/read-all")
async def mark_all_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Markiert alle Benachrichtigungen als gelesen"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({
        "is_read": True,
        "read_at": datetime.utcnow()
    })
    db.commit()
    
    return {"success": True}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht eine Benachrichtigung"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Benachrichtigung nicht gefunden")
    
    db.delete(notification)
    db.commit()
    
    return {"success": True}


# Helper function to create notifications (used by other parts of the app)
def create_notification(
    db: Session,
    user_id: int,
    notification_type: str,
    title: str,
    message: str = None,
    reference_id: int = None,
    reference_type: str = None
) -> Notification:
    """Erstellt eine neue Benachrichtigung für einen Benutzer"""
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        reference_id=reference_id,
        reference_type=reference_type
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
