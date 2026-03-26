from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
from pydantic import BaseModel, Field
from typing import Optional

from app.core.database import get_db
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
    check_password_strength
)
from app.core.config import settings
from app.core.rate_limiter import rate_limit_login, rate_limit_registration
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.models.company import Company
from app.schemas.user import UserCreate, UserRegister, UserResponse, UserLogin, Token
from app.services.email_service import email_service

router = APIRouter(prefix="/auth", tags=["Authentifizierung"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Registriert einen neuen Benutzer"""
    
    # Passwort-Policy prüfen
    check_password_strength(user_data.password)
    
    # Prüfen ob E-Mail bereits existiert
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-Mail-Adresse bereits registriert"
        )
    
    # Benutzer erstellen
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Token erstellen
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """Login mit E-Mail und Passwort"""
    # Rate Limiting: 5 Versuche pro Minute
    await rate_limit_login(request)
    
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ungültige E-Mail oder Passwort",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Benutzer ist deaktiviert"
        )
    
    # Letzten Login-Zeitpunkt aktualisieren
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Gibt die Informationen des aktuellen Benutzers zurück"""
    return current_user


@router.post("/register/applicant", response_model=Token)
async def register_applicant(
    request: Request,
    user_data: UserRegister,
    first_name: str,
    last_name: str,
    db: Session = Depends(get_db)
):
    """Registriert einen neuen Bewerber"""
    # Rate Limiting: 3 Registrierungen pro Stunde pro IP
    await rate_limit_registration(request)
    
    # Passwort-Policy prüfen
    check_password_strength(user_data.password)
    
    # Prüfen ob E-Mail bereits existiert
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-Mail-Adresse bereits registriert"
        )
    
    # Benutzer erstellen
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.APPLICANT,
        last_login_at=datetime.utcnow()  # Registrierung = erster Login
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Bewerber-Profil erstellen
    applicant = Applicant(
        user_id=user.id,
        first_name=first_name,
        last_name=last_name
    )
    db.add(applicant)
    db.commit()
    
    # Willkommens-E-Mail senden
    email_service.send_welcome_email(
        to_email=user.email,
        name=f"{first_name} {last_name}",
        role="applicant"
    )
    
    # Token erstellen
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return Token(
        access_token=access_token,
        user=UserResponse.model_validate(user)
    )


class CompanyRegisterData(BaseModel):
    company_name: str
    legal_form: str
    street: str
    house_number: str
    postal_code: str
    city: str
    phone: str
    contact_person: Optional[str] = None


class CompanyRegisterRequest(BaseModel):
    user_data: UserRegister
    company_data: CompanyRegisterData
    invite_token: Optional[str] = None  # Optionaler Einladungs-Token


@router.post("/register/company")
async def register_company(
    request: Request,
    register_request: CompanyRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    Registriert eine neue Firma.
    - Mit gültigem Einladungs-Token: Sofort aktiv, kann sich direkt einloggen
    - Ohne Token: DEAKTIVIERT, muss von Admin freigeschaltet werden
    """
    from app.models.invite_token import InviteToken
    
    user_data = register_request.user_data
    company_data = register_request.company_data
    invite_token_str = register_request.invite_token
    
    # Rate Limiting: 3 Registrierungen pro Stunde pro IP
    await rate_limit_registration(request)
    
    # Passwort-Policy prüfen
    check_password_strength(user_data.password)
    
    # Prüfen ob E-Mail bereits existiert
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="E-Mail-Adresse bereits registriert"
        )
    
    # Einladungs-Token prüfen (falls vorhanden)
    invite_token = None
    auto_activate = False
    if invite_token_str:
        invite_token = db.query(InviteToken).filter(
            InviteToken.token == invite_token_str
        ).first()
        
        if invite_token and invite_token.is_valid():
            auto_activate = True
        elif invite_token_str:
            # Token angegeben aber ungültig
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ungültiger oder abgelaufener Einladungs-Link"
            )
    
    # Benutzer erstellen
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.COMPANY,
        is_active=auto_activate,  # Aktiv wenn gültiger Token, sonst deaktiviert
        last_login_at=datetime.utcnow() if auto_activate else None  # Login-Zeit nur wenn direkt aktiv
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Firmen-Profil erstellen mit allen Pflichtfeldern
    company = Company(
        user_id=user.id,
        company_name=company_data.company_name,
        legal_form=company_data.legal_form,
        street=company_data.street,
        house_number=company_data.house_number,
        postal_code=company_data.postal_code,
        city=company_data.city,
        phone=company_data.phone,
        contact_person=company_data.contact_person,
        country="Deutschland"  # Default
    )
    db.add(company)
    db.commit()
    
    # Token als verwendet markieren
    if invite_token and auto_activate:
        invite_token.use()
        db.commit()
        
        # Willkommens-E-Mail senden (sofort aktiv)
        email_service.send_welcome_email(
            to_email=user.email,
            name=company_data.company_name,
            role="company"
        )
        
        # Token erstellen für sofortigen Login
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return {
            "message": "Registrierung erfolgreich! Sie können sich jetzt einloggen.",
            "status": "active",
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "email": user.email,
                "role": user.role.value,
                "is_active": user.is_active
            }
        }
    else:
        # Normale Registrierung ohne Token
        # E-Mail senden: Registrierung erhalten, warten auf Freischaltung
        email_service.send_company_registration_pending(
            to_email=user.email,
            company_name=company_data.company_name
        )
        
        # E-Mail an Admins senden
        admin_emails = db.query(User.email).filter(User.role == UserRole.ADMIN, User.is_active == True).all()
        for (admin_email,) in admin_emails:
            email_service.send_admin_new_company_notification(
                to_email=admin_email,
                company_name=company_data.company_name,
                company_email=user.email,
                legal_form=company_data.legal_form,
                address=f"{company_data.street} {company_data.house_number}, {company_data.postal_code} {company_data.city}",
                phone=company_data.phone
            )
        
        # KEIN Token zurückgeben - Firma muss erst aktiviert werden
        return {
            "message": "Registrierung erfolgreich! Ihr Unternehmen wird geprüft und in Kürze freigeschaltet. Sie erhalten eine E-Mail-Benachrichtigung.",
            "status": "pending_activation"
        }


@router.get("/verify-invite/{token}")
async def verify_invite_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Prüft ob ein Einladungs-Token gültig ist (öffentlich)"""
    from app.models.invite_token import InviteToken
    
    invite_token = db.query(InviteToken).filter(InviteToken.token == token).first()
    
    if not invite_token:
        return {"valid": False, "message": "Token nicht gefunden"}
    
    if not invite_token.is_valid():
        reasons = []
        if not invite_token.is_active:
            reasons.append("deaktiviert")
        if invite_token.expires_at and datetime.utcnow() > invite_token.expires_at:
            reasons.append("abgelaufen")
        if invite_token.max_uses and invite_token.current_uses >= invite_token.max_uses:
            reasons.append("Nutzungslimit erreicht")
        
        return {
            "valid": False, 
            "message": f"Token ungültig: {', '.join(reasons)}"
        }
    
    return {
        "valid": True,
        "name": invite_token.name,
        "message": "Gültiger Einladungs-Link"
    }


# === E-Mail-Präferenzen ===

class EmailPreferences(BaseModel):
    email_newsletter: bool = Field(True, description="Newsletter und Marketing E-Mails")
    email_job_alerts: bool = Field(True, description="Benachrichtigungen über neue passende Stellen")
    email_notifications: bool = Field(True, description="Allgemeine Benachrichtigungen (Bewerbungsstatus, etc.)")


class EmailPreferencesResponse(BaseModel):
    email_newsletter: bool
    email_job_alerts: bool
    email_notifications: bool
    message: str = "E-Mail-Einstellungen erfolgreich aktualisiert"


@router.get("/email-preferences", response_model=EmailPreferences)
async def get_email_preferences(
    current_user: User = Depends(get_current_user)
):
    """Gibt die E-Mail-Präferenzen des aktuellen Benutzers zurück"""
    return EmailPreferences(
        email_newsletter=current_user.email_newsletter if current_user.email_newsletter is not None else True,
        email_job_alerts=current_user.email_job_alerts if current_user.email_job_alerts is not None else True,
        email_notifications=current_user.email_notifications if current_user.email_notifications is not None else True
    )


@router.put("/email-preferences", response_model=EmailPreferencesResponse)
async def update_email_preferences(
    preferences: EmailPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert die E-Mail-Präferenzen des aktuellen Benutzers"""
    current_user.email_newsletter = preferences.email_newsletter
    current_user.email_job_alerts = preferences.email_job_alerts
    current_user.email_notifications = preferences.email_notifications
    
    db.commit()
    db.refresh(current_user)
    
    return EmailPreferencesResponse(
        email_newsletter=current_user.email_newsletter,
        email_job_alerts=current_user.email_job_alerts,
        email_notifications=current_user.email_notifications
    )
