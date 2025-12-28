"""
Firmen-Mitglieder API

Ermöglicht Firmen, mehrere Benutzer zu verwalten.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime
import secrets
import string

from app.core.database import get_db
from app.core.security import get_current_user, get_password_hash
from app.models.user import User, UserRole
from app.models.company import Company
from app.models.company_member import CompanyMember, CompanyRole, COMPANY_ROLE_LABELS
from app.services.email_service import email_service

router = APIRouter(prefix="/company/members", tags=["company-members"])


# ========== SCHEMAS ==========

class AddMemberRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: CompanyRole = CompanyRole.MEMBER


class UpdateMemberRequest(BaseModel):
    role: Optional[CompanyRole] = None
    is_active: Optional[bool] = None


class MemberResponse(BaseModel):
    id: int
    user_id: int
    email: str
    first_name: str
    last_name: str
    role: str
    role_label: str
    is_active: bool
    invited_at: datetime
    invited_by: Optional[str] = None


# ========== HELPER FUNCTIONS ==========

def get_company_and_membership(user: User, db: Session):
    """Holt die Firma und Mitgliedschaft des aktuellen Benutzers"""
    # Erst prüfen ob User company role hat
    if user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Nur für Firmen-Benutzer")
    
    # Mitgliedschaft suchen
    membership = db.query(CompanyMember).filter(
        CompanyMember.user_id == user.id,
        CompanyMember.is_active == True
    ).first()
    
    if membership:
        company = membership.company
    else:
        # Fallback: Alte Struktur - User hat direkt eine Company
        company = db.query(Company).filter(Company.user_id == user.id).first()
        if company:
            # Automatisch Owner-Mitgliedschaft erstellen
            membership = CompanyMember(
                user_id=user.id,
                company_id=company.id,
                role=CompanyRole.OWNER,
                is_active=True
            )
            db.add(membership)
            db.commit()
            db.refresh(membership)
    
    if not company:
        raise HTTPException(status_code=404, detail="Firma nicht gefunden")
    
    return company, membership


def generate_temp_password(length=12):
    """Generiert ein temporäres Passwort"""
    chars = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(chars) for _ in range(length))


# ========== ENDPOINTS ==========

@router.get("")
async def get_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[MemberResponse]:
    """Listet alle Mitglieder der eigenen Firma"""
    company, _ = get_company_and_membership(current_user, db)
    
    members = db.query(CompanyMember).filter(
        CompanyMember.company_id == company.id
    ).all()
    
    result = []
    for member in members:
        user = member.user
        invited_by_name = None
        if member.invited_by:
            invited_by_name = member.invited_by.email
        
        # Versuche Namen aus verschiedenen Quellen zu holen
        first_name = "Benutzer"
        last_name = ""
        
        # Prüfe ob es eine Company gibt mit diesem User
        user_company = db.query(Company).filter(Company.user_id == user.id).first()
        if user_company and user_company.contact_person:
            names = user_company.contact_person.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ""
        
        result.append(MemberResponse(
            id=member.id,
            user_id=user.id,
            email=user.email,
            first_name=first_name,
            last_name=last_name,
            role=member.role.value,
            role_label=COMPANY_ROLE_LABELS.get(member.role, "Mitarbeiter"),
            is_active=member.is_active,
            invited_at=member.invited_at or member.created_at,
            invited_by=invited_by_name
        ))
    
    return result


@router.post("")
async def add_member(
    data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fügt einen neuen Benutzer zur Firma hinzu"""
    company, membership = get_company_and_membership(current_user, db)
    
    # Nur Owner und Admin dürfen Benutzer hinzufügen
    if membership.role not in [CompanyRole.OWNER, CompanyRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung zum Hinzufügen von Benutzern")
    
    # Nur Owner darf andere Admins/Owner erstellen
    if data.role in [CompanyRole.OWNER, CompanyRole.ADMIN] and membership.role != CompanyRole.OWNER:
        raise HTTPException(status_code=403, detail="Nur der Inhaber kann Administratoren ernennen")
    
    # Prüfen ob E-Mail bereits existiert
    existing_user = db.query(User).filter(User.email == data.email).first()
    
    if existing_user:
        # Prüfen ob bereits Mitglied dieser Firma
        existing_membership = db.query(CompanyMember).filter(
            CompanyMember.user_id == existing_user.id,
            CompanyMember.company_id == company.id
        ).first()
        
        if existing_membership:
            if existing_membership.is_active:
                raise HTTPException(status_code=400, detail="Dieser Benutzer ist bereits Mitglied der Firma")
            else:
                # Reaktivieren
                existing_membership.is_active = True
                existing_membership.role = data.role
                db.commit()
                return {"message": "Benutzer wurde reaktiviert", "user_id": existing_user.id}
        
        # Benutzer existiert aber ist nicht Mitglied - kann nicht hinzugefügt werden
        # (da er evtl. Bewerber oder andere Firma ist)
        if existing_user.role != UserRole.COMPANY:
            raise HTTPException(status_code=400, detail="Diese E-Mail ist bereits für einen anderen Account-Typ registriert")
    
    # Neuen Benutzer erstellen
    temp_password = generate_temp_password()
    
    new_user = User(
        email=data.email,
        password_hash=get_password_hash(temp_password),
        role=UserRole.COMPANY,
        is_active=True
    )
    db.add(new_user)
    db.flush()  # ID generieren
    
    # Mitgliedschaft erstellen
    new_membership = CompanyMember(
        user_id=new_user.id,
        company_id=company.id,
        role=data.role,
        invited_by_id=current_user.id,
        invited_at=datetime.utcnow(),
        is_active=True
    )
    db.add(new_membership)
    db.commit()
    
    # E-Mail mit Zugangsdaten senden
    email_service.send_email(
        to_email=data.email,
        subject=f"Einladung zu {company.company_name} - IJP Portal",
        html_content=f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #2563eb;">Willkommen bei {company.company_name}!</h1>
                
                <p>Hallo {data.first_name} {data.last_name},</p>
                
                <p>Sie wurden als <strong>{COMPANY_ROLE_LABELS.get(data.role, 'Mitarbeiter')}</strong> 
                zum Team von <strong>{company.company_name}</strong> auf dem IJP Portal hinzugefügt.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Ihre Zugangsdaten:</h3>
                    <p><strong>E-Mail:</strong> {data.email}</p>
                    <p><strong>Temporäres Passwort:</strong> {temp_password}</p>
                </div>
                
                <p style="background: #fef3c7; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                    ⚠️ Bitte ändern Sie Ihr Passwort nach dem ersten Login unter "Einstellungen".
                </p>
                
                <p style="text-align: center; margin: 30px 0;">
                    <a href="https://ijp-portal.vercel.app/login" 
                       style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Jetzt anmelden
                    </a>
                </p>
                
                <p>Mit freundlichen Grüßen,<br>Ihr IJP Team</p>
            </div>
        </body>
        </html>
        """
    )
    
    return {
        "message": f"Benutzer {data.email} wurde hinzugefügt",
        "user_id": new_user.id,
        "temp_password": temp_password  # Nur für Debug, in Produktion entfernen!
    }


@router.put("/{member_id}")
async def update_member(
    member_id: int,
    data: UpdateMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert ein Firmen-Mitglied"""
    company, membership = get_company_and_membership(current_user, db)
    
    # Nur Owner und Admin dürfen Benutzer bearbeiten
    if membership.role not in [CompanyRole.OWNER, CompanyRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    # Ziel-Mitglied finden
    target_member = db.query(CompanyMember).filter(
        CompanyMember.id == member_id,
        CompanyMember.company_id == company.id
    ).first()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    
    # Owner kann nicht geändert werden (außer von sich selbst)
    if target_member.role == CompanyRole.OWNER and target_member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Der Inhaber kann nicht geändert werden")
    
    # Admin kann keine anderen Admins ändern
    if membership.role == CompanyRole.ADMIN and target_member.role == CompanyRole.ADMIN:
        raise HTTPException(status_code=403, detail="Administratoren können andere Administratoren nicht ändern")
    
    if data.role is not None:
        # Nur Owner darf Owner/Admin vergeben
        if data.role in [CompanyRole.OWNER, CompanyRole.ADMIN] and membership.role != CompanyRole.OWNER:
            raise HTTPException(status_code=403, detail="Nur der Inhaber kann diese Rolle vergeben")
        target_member.role = data.role
    
    if data.is_active is not None:
        # Sich selbst kann man nicht deaktivieren
        if target_member.user_id == current_user.id and not data.is_active:
            raise HTTPException(status_code=400, detail="Sie können sich nicht selbst deaktivieren")
        target_member.is_active = data.is_active
    
    db.commit()
    
    return {"message": "Mitglied aktualisiert"}


@router.delete("/{member_id}")
async def remove_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Entfernt ein Mitglied aus der Firma"""
    company, membership = get_company_and_membership(current_user, db)
    
    # Nur Owner und Admin dürfen Benutzer entfernen
    if membership.role not in [CompanyRole.OWNER, CompanyRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    target_member = db.query(CompanyMember).filter(
        CompanyMember.id == member_id,
        CompanyMember.company_id == company.id
    ).first()
    
    if not target_member:
        raise HTTPException(status_code=404, detail="Mitglied nicht gefunden")
    
    # Owner kann nicht entfernt werden
    if target_member.role == CompanyRole.OWNER:
        raise HTTPException(status_code=403, detail="Der Inhaber kann nicht entfernt werden")
    
    # Sich selbst kann man nicht entfernen
    if target_member.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Sie können sich nicht selbst entfernen")
    
    # Admin kann keine anderen Admins entfernen
    if membership.role == CompanyRole.ADMIN and target_member.role == CompanyRole.ADMIN:
        raise HTTPException(status_code=403, detail="Administratoren können andere Administratoren nicht entfernen")
    
    # Mitgliedschaft deaktivieren (nicht löschen für Audit)
    target_member.is_active = False
    db.commit()
    
    return {"message": "Mitglied entfernt"}


@router.get("/roles")
async def get_available_roles(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt verfügbare Rollen zurück"""
    _, membership = get_company_and_membership(current_user, db)
    
    roles = [
        {"value": "member", "label": "Mitarbeiter", "description": "Kann Stellen und Bewerbungen verwalten"}
    ]
    
    if membership.role == CompanyRole.OWNER:
        roles.append({"value": "admin", "label": "Administrator", "description": "Kann zusätzlich Benutzer verwalten"})
    
    return roles

