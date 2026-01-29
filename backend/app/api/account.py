"""
Account Management API - Passwort Reset, Änderungen, Account löschen
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash, verify_password, check_password_strength
from app.core.rate_limiter import rate_limit_password_reset
from app.services.email_service import email_service
from app.models.user import User, UserRole
from app.models.password_reset import PasswordResetToken
from app.models.applicant import Applicant
from app.models.company import Company
from app.models.application import Application
from app.models.job_posting import JobPosting
from app.models.document import Document

router = APIRouter(prefix="/account", tags=["Account"])


# ==================== SCHEMAS ====================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    password: str


class DeleteAccountRequest(BaseModel):
    password: str
    confirmation: str  # Muss "DELETE" sein


# ==================== PASSWORT VERGESSEN ====================

@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Sendet einen Passwort-Reset Link an die E-Mail.
    Gibt immer eine Erfolgsmeldung zurück (Sicherheit).
    """
    # Rate Limiting: 3 Versuche pro 5 Minuten
    await rate_limit_password_reset(request)
    
    user = db.query(User).filter(User.email == data.email).first()
    
    # Immer gleiche Antwort (verhindert E-Mail-Enumeration)
    success_message = {
        "message": "Falls ein Account mit dieser E-Mail existiert, wurde ein Reset-Link gesendet."
    }
    
    if not user:
        return success_message
    
    # Alte Tokens für diesen User invalidieren
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.is_used == False
    ).update({"is_used": True})
    
    # Neuen Token erstellen
    token = PasswordResetToken(
        user_id=user.id,
        token=PasswordResetToken.generate_token(),
        expires_at=PasswordResetToken.get_expiry()
    )
    db.add(token)
    db.commit()
    
    # Benutzername für E-Mail ermitteln
    user_name = None
    if user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
        if applicant and applicant.first_name:
            user_name = applicant.first_name
    elif user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user.id).first()
        if company:
            user_name = company.company_name
    
    # E-Mail senden
    await email_service.send_password_reset_email(
        to_email=user.email,
        reset_token=token.token,
        user_name=user_name
    )
    
    return success_message


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Setzt das Passwort mit einem gültigen Token zurück"""
    
    # Token suchen
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == data.token
    ).first()
    
    if not reset_token or not reset_token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültiger oder abgelaufener Token. Bitte fordern Sie einen neuen Link an."
        )
    
    # Passwort-Policy prüfen
    check_password_strength(data.new_password)
    
    # User finden und Passwort aktualisieren
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Benutzer nicht gefunden"
        )
    
    user.password_hash = get_password_hash(data.new_password)
    reset_token.is_used = True
    db.commit()
    
    return {"message": "Passwort erfolgreich geändert. Sie können sich jetzt anmelden."}


@router.get("/verify-reset-token/{token}")
async def verify_reset_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Prüft ob ein Reset-Token gültig ist"""
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == token
    ).first()
    
    if not reset_token or not reset_token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültiger oder abgelaufener Token"
        )
    
    return {"valid": True, "message": "Token ist gültig"}


# ==================== PASSWORT ÄNDERN (eingeloggt) ====================

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ändert das Passwort eines eingeloggten Benutzers"""
    
    # Aktuelles Passwort prüfen
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aktuelles Passwort ist falsch"
        )
    
    # Passwort-Policy prüfen
    check_password_strength(data.new_password)
    
    if data.current_password == data.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Neues Passwort muss sich vom aktuellen unterscheiden"
        )
    
    # Passwort aktualisieren
    current_user.password_hash = get_password_hash(data.new_password)
    db.commit()
    
    return {"message": "Passwort erfolgreich geändert"}


# ==================== E-MAIL ÄNDERN ====================

@router.post("/change-email")
async def change_email(
    data: ChangeEmailRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ändert die E-Mail-Adresse eines eingeloggten Benutzers"""
    
    # Passwort prüfen
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwort ist falsch"
        )
    
    # Prüfen ob neue E-Mail bereits existiert
    existing = db.query(User).filter(User.email == data.new_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Diese E-Mail-Adresse wird bereits verwendet"
        )
    
    if current_user.email == data.new_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Die neue E-Mail ist identisch mit der aktuellen"
        )
    
    old_email = current_user.email
    current_user.email = data.new_email
    db.commit()
    
    return {
        "message": "E-Mail-Adresse erfolgreich geändert",
        "old_email": old_email,
        "new_email": data.new_email
    }


# ==================== ACCOUNT LÖSCHEN ====================

@router.post("/delete-account")
async def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Löscht den Account des eingeloggten Benutzers unwiderruflich"""
    
    # Sicherheitsbestätigung prüfen
    if data.confirmation != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bitte geben Sie 'DELETE' zur Bestätigung ein"
        )
    
    # Passwort prüfen
    if not verify_password(data.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwort ist falsch"
        )
    
    user_id = current_user.id
    user_role = current_user.role
    
    # Zugehörige Daten löschen je nach Rolle
    deleted_files = 0
    if user_role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == user_id).first()
        if applicant:
            # IJP-Aufträge löschen (WICHTIG: vor Applicant löschen!)
            from app.models.job_request import JobRequest
            db.query(JobRequest).filter(JobRequest.applicant_id == applicant.id).delete()
            
            # Interviews löschen (vor Bewerbungen!)
            from app.models.interview import Interview
            applications = db.query(Application).filter(Application.applicant_id == applicant.id).all()
            for app in applications:
                db.query(Interview).filter(Interview.application_id == app.id).delete()
            
            # Bewerbungen löschen
            db.query(Application).filter(Application.applicant_id == applicant.id).delete()
            
            # Dokumente aus Storage (R2/Lokal) löschen - DSGVO-konform!
            from app.services.storage_service import storage_service
            documents = db.query(Document).filter(Document.applicant_id == applicant.id).all()
            for doc in documents:
                if doc.file_path:
                    try:
                        await storage_service.delete_file(doc.file_path)
                        deleted_files += 1
                    except Exception as e:
                        # Fehler loggen, aber weitermachen
                        import logging
                        logging.error(f"Fehler beim Löschen der Datei {doc.file_path}: {e}")
            
            # Dokumente aus DB löschen
            db.query(Document).filter(Document.applicant_id == applicant.id).delete()
            # Bewerber-Profil löschen
            db.delete(applicant)
    
    elif user_role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == user_id).first()
        if company:
            from app.models.interview import Interview
            # Alle Jobs der Firma
            jobs = db.query(JobPosting).filter(JobPosting.company_id == company.id).all()
            for job in jobs:
                # Interviews zu Bewerbungen dieser Jobs löschen
                applications = db.query(Application).filter(Application.job_posting_id == job.id).all()
                for app in applications:
                    db.query(Interview).filter(Interview.application_id == app.id).delete()
                # Bewerbungen zu diesen Jobs löschen
                db.query(Application).filter(Application.job_posting_id == job.id).delete()
            # Jobs löschen
            db.query(JobPosting).filter(JobPosting.company_id == company.id).delete()
            # Firma löschen
            db.delete(company)
    
    # Password Reset Tokens löschen
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete()
    
    # User löschen
    db.delete(current_user)
    db.commit()
    
    return {
        "message": "Ihr Account wurde erfolgreich gelöscht",
        "deleted_files": deleted_files
    }


# ==================== ACCOUNT INFO ====================

@router.get("/me")
async def get_account_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt Account-Informationen zurück"""
    
    info = {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }
    
    if current_user.role == UserRole.APPLICANT:
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        if applicant:
            info["profile"] = {
                "first_name": applicant.first_name,
                "last_name": applicant.last_name,
                "position_type": applicant.position_type.value if applicant.position_type else None
            }
    elif current_user.role == UserRole.COMPANY:
        company = db.query(Company).filter(Company.user_id == current_user.id).first()
        if company:
            info["profile"] = {
                "company_name": company.company_name,
                "industry": company.industry
            }
    
    return info
