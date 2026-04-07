"""
Google OAuth für Bewerber-Registrierung und Login
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.services.email_service import email_service

router = APIRouter(prefix="/auth/google", tags=["Google OAuth"])


class GoogleAuthRequest(BaseModel):
    """Google ID Token vom Frontend"""
    credential: str  # Google ID Token


class GoogleAuthResponse(BaseModel):
    """Antwort nach erfolgreicher Google-Authentifizierung"""
    access_token: str
    token_type: str = "bearer"
    user: dict
    is_new_user: bool


@router.post("/login", response_model=GoogleAuthResponse)
async def google_login(
    data: GoogleAuthRequest,
    db: Session = Depends(get_db)
):
    """
    Login oder Registrierung mit Google Account (nur für Bewerber).
    
    1. Verifiziert das Google ID Token
    2. Prüft ob User existiert (Login) oder erstellt neuen (Registrierung)
    3. Gibt JWT Token zurück
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Login ist nicht konfiguriert"
        )
    
    try:
        # Google ID Token verifizieren
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
        
        # Token-Informationen extrahieren
        google_id = idinfo['sub']
        email = idinfo['email']
        email_verified = idinfo.get('email_verified', False)
        given_name = idinfo.get('given_name', '')
        family_name = idinfo.get('family_name', '')
        
        if not email_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="E-Mail-Adresse ist nicht verifiziert"
            )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Ungültiges Google Token: {str(e)}"
        )
    
    # Prüfen ob User bereits existiert (per google_id oder email)
    user = db.query(User).filter(User.google_id == google_id).first()
    is_new_user = False
    
    if not user:
        # Prüfen ob E-Mail bereits existiert (ohne Google-Verknüpfung)
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Existierender User - Google-ID verknüpfen (nur wenn Bewerber)
            if user.role != UserRole.APPLICANT:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Google Login ist nur für Bewerber verfügbar. Bitte nutzen Sie den normalen Login."
                )
            
            # Google-ID mit bestehendem Account verknüpfen
            user.google_id = google_id
            db.commit()
        else:
            # Neuer User - Registrierung
            is_new_user = True
            
            # User erstellen (ohne Passwort)
            user = User(
                email=email,
                password_hash=None,  # Kein Passwort bei OAuth
                role=UserRole.APPLICANT,
                google_id=google_id,
                is_active=True
            )
            db.add(user)
            db.flush()  # ID generieren
            
            # Applicant-Profil erstellen
            applicant = Applicant(
                user_id=user.id,
                first_name=given_name or "Vorname",
                last_name=family_name or "Nachname"
            )
            db.add(applicant)
            db.commit()
            
            # Willkommens-E-Mail senden
            try:
                email_service.send_welcome_email(email, given_name or "Bewerber")
            except Exception:
                pass  # E-Mail-Fehler nicht kritisch
    
    # Login-Zeit aktualisieren
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    
    # JWT Token erstellen
    access_token = create_access_token(data={"sub": user.email})
    
    # Applicant-Daten laden
    applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
    
    return GoogleAuthResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "has_google": True,
            "has_password": user.password_hash is not None,
            "applicant": {
                "id": applicant.id,
                "first_name": applicant.first_name,
                "last_name": applicant.last_name,
                "profile_complete": applicant.is_profile_complete if hasattr(applicant, 'is_profile_complete') else False
            } if applicant else None
        },
        is_new_user=is_new_user
    )


@router.get("/config")
async def get_google_config():
    """
    Gibt die Google Client ID für das Frontend zurück.
    Secret wird NICHT zurückgegeben!
    """
    if not settings.GOOGLE_CLIENT_ID:
        return {"enabled": False}
    
    return {
        "enabled": True,
        "client_id": settings.GOOGLE_CLIENT_ID
    }
