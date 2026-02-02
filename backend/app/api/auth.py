from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
    check_password_strength
)
from app.core.config import settings
from app.core.rate_limiter import (
    rate_limit_login, 
    rate_limit_registration,
    check_account_lockout,
    record_failed_login,
    reset_failed_logins
)
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
    # Rate Limiting: 5 Versuche pro Minute (IP-basiert)
    await rate_limit_login(request)
    
    # Account Lockout prüfen (E-Mail-basiert)
    await check_account_lockout(form_data.username)
    
    user = db.query(User).filter(User.email == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        # Fehlversuch aufzeichnen für Account Lockout
        await record_failed_login(form_data.username)
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
    
    # Erfolgreicher Login - Fehlversuche zurücksetzen
    await reset_failed_logins(form_data.username)
    
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
        role=UserRole.APPLICANT
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


@router.post("/register/company")
async def register_company(
    request: Request,
    user_data: UserRegister,
    company_name: str,
    db: Session = Depends(get_db)
):
    """
    Registriert eine neue Firma.
    WICHTIG: Firmen sind nach der Registrierung DEAKTIVIERT und müssen erst 
    von einem Admin freigeschaltet werden.
    """
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
    
    # Benutzer erstellen - DEAKTIVIERT bis Admin freischaltet
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=UserRole.COMPANY,
        is_active=False  # Firma muss erst aktiviert werden!
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Firmen-Profil erstellen
    company = Company(
        user_id=user.id,
        company_name=company_name
    )
    db.add(company)
    db.commit()
    
    # E-Mail senden: Registrierung erhalten, warten auf Freischaltung
    email_service.send_company_registration_pending(
        to_email=user.email,
        company_name=company_name
    )
    
    # KEIN Token zurückgeben - Firma muss erst aktiviert werden
    return {
        "message": "Registrierung erfolgreich! Ihr Unternehmen wird geprüft und in Kürze freigeschaltet. Sie erhalten eine E-Mail-Benachrichtigung.",
        "status": "pending_activation"
    }
