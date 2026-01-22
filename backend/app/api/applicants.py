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
    Der CV wird automatisch auch als Dokument gespeichert.
    """
    import os
    from app.models.document import Document
    from app.services.storage_service import storage_service
    import uuid
    
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
    
    # ========== CV AUTOMATISCH ALS DOKUMENT SPEICHERN ==========
    cv_saved = False
    try:
        # Bewerber-Profil holen
        applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
        
        if applicant:
            # Prüfen ob bereits ein CV existiert
            existing_cv = db.query(Document).filter(
                Document.applicant_id == applicant.id,
                Document.document_type == "cv"
            ).first()
            
            # Wenn ja, altes löschen
            if existing_cv:
                try:
                    await storage_service.delete_file(existing_cv.storage_path)
                except:
                    pass
                db.delete(existing_cv)
                db.commit()
            
            # Neues Dokument speichern
            storage_filename = f"{uuid.uuid4()}.pdf"
            
            # In Cloud-Storage hochladen (korrekte Signatur!)
            success, storage_path, error = await storage_service.upload_file(
                file_content=content,
                applicant_id=applicant.id,
                filename=storage_filename,
                content_type="application/pdf"
            )
            
            if success:
                # Dokument in DB speichern (korrekte Feldnamen!)
                new_doc = Document(
                    applicant_id=applicant.id,
                    document_type="cv",
                    file_name=storage_filename,  # Gespeicherter Dateiname
                    original_name=file.filename,  # Originaler Dateiname
                    file_path=storage_path,  # Pfad im Storage
                    file_size=len(content),
                    mime_type="application/pdf"
                )
                db.add(new_doc)
                db.commit()
                cv_saved = True
                logger.info(f"CV automatisch als Dokument gespeichert für Bewerber {applicant.id}")
            else:
                logger.warning(f"CV Upload fehlgeschlagen: {error}")
            
    except Exception as e:
        logger.warning(f"CV konnte nicht als Dokument gespeichert werden: {e}")
        # Kein Fehler werfen - CV-Parsing soll trotzdem funktionieren
    
    # PDF Text extrahieren
    try:
        import fitz  # PyMuPDF
        pdf_document = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in pdf_document:
            text += page.get_text()
        pdf_document.close()
        
        if not text.strip():
            # CV wurde trotzdem gespeichert, aber kein Text extrahierbar
            return {
                "message": "Ihr Lebenslauf wurde gespeichert, aber die automatische Textanalyse war nicht möglich.",
                "cv_saved": cv_saved,
                "parse_error": "Das PDF scheint gescannt zu sein (keine Textebene). Bitte füllen Sie Ihr Profil manuell aus oder laden Sie ein digitales PDF hoch."
            }
            
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
    
    # ========== CV PARSING ==========
    # Verwende verbessertes Regex-basiertes Parsing
    # (Gemini API temporär deaktiviert wegen 404-Fehlern)
    
    result = parse_cv_fallback(text)
    result["cv_saved"] = cv_saved
    return result


def parse_cv_fallback(text: str) -> dict:
    """Verbessertes Fallback-Parsing ohne AI - extrahiert mehr Daten"""
    import re
    
    result = {
        "message": "Basis-Extraktion durchgeführt. Bitte überprüfen und ergänzen Sie die Daten manuell."
    }
    
    # Text normalisieren
    text_lower = text.lower()
    lines = text.split('\n')
    
    # ========== KONTAKTDATEN ==========
    
    # E-Mail finden
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    if email_match:
        result["email"] = email_match.group()
    
    # Telefonnummer finden (verschiedene Formate)
    phone_patterns = [
        r'(?:Tel\.?|Telefon|Phone|Mobil|Mobile|Handy)[:\s]*([+\d\s\-\(\)\/]{8,})',
        r'(\+\d{1,3}[\s\-]?\d{2,4}[\s\-]?\d{4,})',  # +49 123 456789
        r'(\d{3,5}[\s\-\/]\d{4,})',  # 0123 456789
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text, re.IGNORECASE)
        if phone_match:
            phone = re.sub(r'[^\d+]', '', phone_match.group(1) if phone_match.lastindex else phone_match.group())
            if len(phone) >= 8:
                result["phone"] = phone_match.group(1).strip() if phone_match.lastindex else phone_match.group().strip()
                break
    
    # ========== NAME ==========
    # Versuche Namen aus ersten Zeilen zu extrahieren
    for i, line in enumerate(lines[:10]):
        line = line.strip()
        # Überspringe leere Zeilen und typische Header
        if not line or len(line) < 3 or any(x in line.lower() for x in ['lebenslauf', 'curriculum', 'resume', 'cv', '@', 'tel', 'email']):
            continue
        # Prüfe ob es wie ein Name aussieht (2-3 Wörter, nur Buchstaben)
        words = line.split()
        if 2 <= len(words) <= 4 and all(w.replace('-', '').replace("'", '').isalpha() for w in words):
            result["first_name"] = words[0]
            result["last_name"] = ' '.join(words[1:])
            break
    
    # ========== GEBURTSDATUM ==========
    date_patterns = [
        (r'(?:geboren|geb\.?|birth|dob)[:\s]*(\d{1,2})[./](\d{1,2})[./](\d{4})', 'dmy'),
        (r'(\d{1,2})[./](\d{1,2})[./](\d{4})', 'dmy'),
        (r'(\d{4})-(\d{2})-(\d{2})', 'ymd'),
    ]
    for pattern, fmt in date_patterns:
        date_match = re.search(pattern, text, re.IGNORECASE)
        if date_match:
            groups = date_match.groups()
            if fmt == 'ymd':
                result["date_of_birth"] = f"{groups[0]}-{groups[1]}-{groups[2]}"
            else:  # dmy
                day = groups[0].zfill(2)
                month = groups[1].zfill(2)
                year = groups[2]
                if int(day) <= 31 and int(month) <= 12:
                    result["date_of_birth"] = f"{year}-{month}-{day}"
            break
    
    # ========== ADRESSE ==========
    # PLZ und Stadt (deutsches/österreichisches/schweizer Format)
    plz_city = re.search(r'(\d{4,5})\s+([A-Za-zäöüÄÖÜßéèêëàâùûîïôç\-\s]{2,30})', text)
    if plz_city:
        result["postal_code"] = plz_city.group(1)
        city = plz_city.group(2).strip()
        # Entferne trailing Wörter die keine Stadt sein können
        city = re.sub(r'\s+(deutschland|germany|österreich|austria|schweiz|switzerland).*$', '', city, flags=re.IGNORECASE)
        result["city"] = city.strip()
    
    # Straße mit Hausnummer
    street_match = re.search(r'([A-Za-zäöüÄÖÜß\-\.\s]{3,40}(?:str\.?|straße|strasse|weg|platz|allee|gasse))\s*(\d{1,4}\s*[a-z]?)', text, re.IGNORECASE)
    if street_match:
        result["street"] = street_match.group(1).strip()
        result["house_number"] = street_match.group(2).strip()
    
    # ========== NATIONALITÄT ==========
    nationality_patterns = [
        r'(?:nationalität|staatsangehörigkeit|nationality|citizenship)[:\s]*([A-Za-zäöüÄÖÜß]+)',
    ]
    for pattern in nationality_patterns:
        nat_match = re.search(pattern, text, re.IGNORECASE)
        if nat_match:
            result["nationality"] = nat_match.group(1).strip()
            break
    
    # ========== SPRACHKENNTNISSE ==========
    # Deutsch
    german_patterns = [
        (r'deutsch[:\s]*([A-C][12]|muttersprache|fließend|sehr gut|gut|grundkenntnisse)', re.IGNORECASE),
    ]
    for pattern, flags in german_patterns:
        match = re.search(pattern, text, flags)
        if match:
            level = match.group(1).lower()
            if 'mutter' in level or 'c2' in level:
                result["german_level"] = "C2"
            elif 'fließend' in level or 'c1' in level:
                result["german_level"] = "C1"
            elif 'sehr gut' in level or 'b2' in level:
                result["german_level"] = "B2"
            elif 'gut' in level or 'b1' in level:
                result["german_level"] = "B1"
            elif 'grund' in level or 'a' in level:
                result["german_level"] = "A1"
            break
    
    # Englisch
    english_patterns = [
        (r'(?:englisch|english)[:\s]*([A-C][12]|muttersprache|fließend|fluent|sehr gut|gut|grundkenntnisse|basic)', re.IGNORECASE),
    ]
    for pattern, flags in english_patterns:
        match = re.search(pattern, text, flags)
        if match:
            level = match.group(1).lower()
            if 'mutter' in level or 'c2' in level or 'native' in level:
                result["english_level"] = "C2"
            elif 'fließend' in level or 'fluent' in level or 'c1' in level:
                result["english_level"] = "C1"
            elif 'sehr gut' in level or 'b2' in level:
                result["english_level"] = "B2"
            elif 'gut' in level or 'b1' in level:
                result["english_level"] = "B1"
            elif 'grund' in level or 'basic' in level or 'a' in level:
                result["english_level"] = "A1"
            break
    
    # ========== BILDUNG ==========
    # Universität/Hochschule
    uni_patterns = [
        r'(?:universität|university|hochschule|fachhochschule|tu |fh )[:\s]*([A-Za-zäöüÄÖÜß\s\-]{5,50})',
    ]
    for pattern in uni_patterns:
        uni_match = re.search(pattern, text, re.IGNORECASE)
        if uni_match:
            result["university_name"] = uni_match.group(1).strip()[:50]
            break
    
    # Studienfach
    study_patterns = [
        r'(?:studium|studiengang|fachrichtung|major)[:\s]*([A-Za-zäöüÄÖÜß\s\-]{3,40})',
    ]
    for pattern in study_patterns:
        study_match = re.search(pattern, text, re.IGNORECASE)
        if study_match:
            result["field_of_study"] = study_match.group(1).strip()
            break
    
    return result
