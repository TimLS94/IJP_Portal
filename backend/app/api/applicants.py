from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import logging
import io

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.applicant import Applicant
from app.schemas.applicant import ApplicantCreate, ApplicantUpdate, ApplicantResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/applicants", tags=["Bewerber"])


def get_applicant_or_404(user: User, db: Session) -> Applicant:
    """Holt das Bewerber-Profil oder wirft 404"""
    applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber-Profil nicht gefunden"
        )
    return applicant


@router.get("/me", response_model=ApplicantResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt das eigene Bewerber-Profil zurück"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    return get_applicant_or_404(current_user, db)


@router.post("/me", response_model=ApplicantResponse)
async def create_my_profile(
    profile_data: ApplicantCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erstellt das eigene Bewerber-Profil"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    # Prüfen ob bereits ein Profil existiert
    existing = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bewerber-Profil existiert bereits"
        )
    
    applicant = Applicant(
        user_id=current_user.id,
        **profile_data.model_dump()
    )
    db.add(applicant)
    db.commit()
    db.refresh(applicant)
    return applicant


@router.put("/me", response_model=ApplicantResponse)
async def update_my_profile(
    profile_data: ApplicantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktualisiert das eigene Bewerber-Profil"""
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können auf diesen Endpunkt zugreifen"
        )
    
    applicant = get_applicant_or_404(current_user, db)
    
    update_data = profile_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(applicant, field, value)
    
    db.commit()
    db.refresh(applicant)
    return applicant


@router.get("/{applicant_id}", response_model=ApplicantResponse)
async def get_applicant(
    applicant_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt ein Bewerber-Profil zurück (nur für Firmen)"""
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Firmen können Bewerber-Profile einsehen"
        )
    
    applicant = db.query(Applicant).filter(Applicant.id == applicant_id).first()
    if not applicant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bewerber nicht gefunden"
        )
    return applicant


@router.post("/parse-cv")
async def parse_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analysiert einen hochgeladenen Lebenslauf (PDF) und extrahiert relevante Daten.
    Verwendet OpenAI GPT zur Extraktion strukturierter Daten.
    """
    import os
    
    if current_user.role != UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Bewerber können diese Funktion nutzen"
        )
    
    # Validierung
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nur PDF-Dateien werden akzeptiert"
        )
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datei ist zu groß (max. 10 MB)"
        )
    
    # PDF Text extrahieren
    try:
        import fitz  # PyMuPDF
        pdf_document = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in pdf_document:
            text += page.get_text()
        pdf_document.close()
        
        if not text.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Konnte keinen Text aus dem PDF extrahieren. Ist das PDF möglicherweise gescannt?"
            )
            
    except ImportError:
        logger.warning("PyMuPDF nicht installiert, versuche Alternative...")
        # Fallback ohne PDF-Parsing - nur Fehlermeldung
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="PDF-Verarbeitung ist nicht verfügbar. Bitte kontaktieren Sie den Support."
        )
    except Exception as e:
        logger.error(f"PDF Parsing Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fehler beim Lesen des PDFs"
        )
    
    # Google Gemini API für Datenextraktion (kostenlos!)
    google_api_key = os.environ.get("GOOGLE_API_KEY")
    if not google_api_key:
        logger.warning("Google API Key nicht konfiguriert - verwende Fallback-Parsing")
        return parse_cv_fallback(text)
    
    try:
        import google.generativeai as genai
        import json
        
        genai.configure(api_key=google_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""Analysiere den folgenden Lebenslauf und extrahiere die relevanten Informationen im JSON-Format.
        
WICHTIG: Gib NUR valides JSON zurück, keine Erklärungen oder Markdown-Codeblöcke.

Extrahiere folgende Felder (falls vorhanden, sonst weglassen):
- first_name: Vorname
- last_name: Nachname  
- date_of_birth: Geburtsdatum im Format YYYY-MM-DD
- place_of_birth: Geburtsort
- nationality: Nationalität (auf Deutsch, z.B. "Russisch", "Ukrainisch")
- phone: Telefonnummer
- street: Straße (ohne Hausnummer)
- house_number: Hausnummer
- postal_code: Postleitzahl
- city: Stadt
- country: Land
- german_level: Deutschkenntnisse als GER-Level (A1, A2, B1, B2, C1, C2 oder "keine")
- english_level: Englischkenntnisse als GER-Level (A1, A2, B1, B2, C1, C2 oder "keine")
- other_languages: Array von {{"language": "Sprache", "level": "A1-C2"}}
- university_name: Name der Universität/Hochschule
- field_of_study: Studienfach
- profession: Ausgeübter Beruf
- school_degree: Schulabschluss
- work_experiences: Array von {{
    "company": "Firmenname",
    "position": "Position/Tätigkeit", 
    "location": "Ort",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD oder null falls aktuell",
    "description": "Kurze Beschreibung der Tätigkeiten"
  }}

Lebenslauf-Text:
{text[:12000]}

Antworte NUR mit dem JSON-Objekt (ohne ```json oder andere Formatierung):"""

        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # JSON aus Antwort extrahieren (falls in Markdown-Codeblock)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        parsed_data = json.loads(response_text)
        parsed_data["message"] = "Daten erfolgreich aus Lebenslauf extrahiert"
        
        return parsed_data
        
    except ImportError:
        logger.warning("Google Generative AI nicht installiert")
        return parse_cv_fallback(text)
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {e}")
        return parse_cv_fallback(text)
    except Exception as e:
        error_msg = str(e).lower()
        logger.error(f"Google Gemini API Error: {e}")
        
        # Rate Limit / Quota Exceeded
        if "quota" in error_msg or "rate" in error_msg or "limit" in error_msg or "429" in error_msg or "resource_exhausted" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Die automatische Lebenslauf-Analyse ist heute leider ausgelastet. Bitte versuchen Sie es morgen erneut oder füllen Sie Ihr Profil manuell aus."
            )
        
        # Andere Fehler - Fallback
        return parse_cv_fallback(text)


def parse_cv_fallback(text: str) -> dict:
    """Einfaches Fallback-Parsing ohne AI"""
    import re
    
    result = {
        "message": "Basis-Extraktion durchgeführt. Bitte überprüfen und ergänzen Sie die Daten manuell."
    }
    
    # E-Mail finden
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        result["email"] = email_match.group()
    
    # Telefonnummer finden
    phone_match = re.search(r'[\+]?[\d\s\-\(\)]{10,}', text)
    if phone_match:
        result["phone"] = phone_match.group().strip()
    
    # Geburtsdatum finden (verschiedene Formate)
    date_patterns = [
        r'(\d{2})[./](\d{2})[./](\d{4})',  # DD.MM.YYYY oder DD/MM/YYYY
        r'(\d{4})-(\d{2})-(\d{2})',         # YYYY-MM-DD
    ]
    for pattern in date_patterns:
        date_match = re.search(pattern, text)
        if date_match:
            groups = date_match.groups()
            if len(groups[0]) == 4:  # YYYY-MM-DD
                result["date_of_birth"] = f"{groups[0]}-{groups[1]}-{groups[2]}"
            else:  # DD.MM.YYYY
                result["date_of_birth"] = f"{groups[2]}-{groups[1]}-{groups[0]}"
            break
    
    # PLZ und Stadt (deutsches Format)
    plz_city = re.search(r'(\d{5})\s+([A-Za-zäöüÄÖÜß\-]+)', text)
    if plz_city:
        result["postal_code"] = plz_city.group(1)
        result["city"] = plz_city.group(2)
    
    return result
