"""
Seed-Daten für Entwicklung
Erstellt automatisch Admin, Bewerber und Firma beim Start

WARNUNG: Diese Datei enthält Test-Passwörter und sollte NUR in der Entwicklung
verwendet werden. In Produktion wird diese Funktion NICHT aufgerufen (DEBUG=False).

WICHTIG für Produktion:
1. Erstellen Sie den Admin-User manuell oder über ein sicheres Script
2. Verwenden Sie sichere, einzigartige Passwörter
3. Ändern Sie die Standard-Admin-Credentials sofort nach dem ersten Login
"""
from datetime import date, datetime
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.applicant import Applicant, PositionType, LanguageLevel
from app.models.company import Company
from app.models.blog import BlogPost, BlogCategory
from app.core.security import get_password_hash


def seed_database(db: Session):
    """Erstellt Testdaten wenn die Datenbank leer ist"""
    
    # ========== ADMIN ==========
    admin_email = "IJP_Admin_001@ijp-portal.de"
    if not db.query(User).filter(User.email == admin_email).first():
        admin = User(
            email=admin_email,
            password_hash=get_password_hash("IJP#Secure2025!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("✓ Admin erstellt: IJP_Admin_001@ijp-portal.de / IJP#Secure2025!")
    
    # ========== BEWERBER: Max Mustermann ==========
    bewerber_email = "max@example.com"
    bewerber_user = db.query(User).filter(User.email == bewerber_email).first()
    
    if not bewerber_user:
        # User erstellen
        bewerber_user = User(
            email=bewerber_email,
            password_hash=get_password_hash("bewerber123"),
            role=UserRole.APPLICANT,
            is_active=True
        )
        db.add(bewerber_user)
        db.commit()
        db.refresh(bewerber_user)
    
    # Prüfen ob Profil existiert
    if not db.query(Applicant).filter(Applicant.user_id == bewerber_user.id).first():
        # Vollständiges Bewerberprofil
        bewerber = Applicant(
            user_id=bewerber_user.id,
            # Persönliche Daten
            first_name="Max",
            last_name="Mustermann",
            date_of_birth=date(1998, 5, 15),
            place_of_birth="Moskau, Russland",
            nationality="Russisch",
            phone="+7 123 4567890",
            
            # Adresse
            street="Beispielstraße",
            house_number="42",
            postal_code="123456",
            city="Moskau",
            country="Russland",
            
            # Stellenart
            position_type=PositionType.STUDENTENFERIENJOB,
            
            # Sprachkenntnisse
            german_level=LanguageLevel.B1,
            english_level=LanguageLevel.B2,
            other_languages=[
                {"language": "Russisch", "level": "c2"},
                {"language": "Ukrainisch", "level": "b1"}
            ],
            
            # Berufserfahrung
            work_experience_years=2,
            work_experience="Praktikum bei IT-Firma, Kellner in Restaurant",
            been_to_germany=True,
            germany_details="2022 für 3 Monate als Tourist in Berlin und München",
            
            # Studenten-Daten (Usbekische Uni für Anabin-Test)
            university_name="Filiale der Staatlichen Technischen Universität Taschkent in Almalyk",
            university_street="Amir Temur Straße",
            university_house_number="15",
            university_postal_code="110100",
            university_city="Almalyk",
            university_country="Usbekistan",
            field_of_study="Informatik",
            current_semester=6,
            semester_break_start=date(2025, 6, 15),
            semester_break_end=date(2025, 8, 31),
            continue_studying=True,
            
            # Zusätzliche Infos
            additional_info="Ich bin motiviert und fleißig. Suche Arbeit in der Landwirtschaft oder Gastronomie."
        )
        db.add(bewerber)
        db.commit()
        print("✓ Bewerber erstellt: max@example.com / bewerber123")
    
    # ========== FIRMA: Musterfirma GmbH ==========
    firma_email = "firma@example.com"
    firma_user = db.query(User).filter(User.email == firma_email).first()
    
    if not firma_user:
        # User erstellen
        firma_user = User(
            email=firma_email,
            password_hash=get_password_hash("firma123"),
            role=UserRole.COMPANY,
            is_active=True
        )
        db.add(firma_user)
        db.commit()
        db.refresh(firma_user)
    
    # Prüfen ob Firmenprofil existiert
    if not db.query(Company).filter(Company.user_id == firma_user.id).first():
        # Vollständiges Firmenprofil
        firma = Company(
            user_id=firma_user.id,
            company_name="Musterfirma GmbH",
            industry="Landwirtschaft",
            description="Wir sind ein moderner Obstbaubetrieb im Herzen Bayerns. Seit über 50 Jahren bauen wir Äpfel, Birnen und Kirschen an. Während der Erntezeit (Juni-September) suchen wir fleißige Helfer aus dem In- und Ausland.",
            website="https://www.musterfirma.de",
            
            # Kontaktperson
            contact_person="Hans Schmidt",
            phone="+49 89 12345678",
            
            # Adresse
            street="Obstgartenweg",
            house_number="15",
            postal_code="85354",
            city="Freising",
            country="Deutschland",
            
            # Größe
            company_size="11-50"
        )
        db.add(firma)
        db.commit()
        print("✓ Firma erstellt: firma@example.com / firma123")
    
    # ========== BLOG-EINTRÄGE ==========
    admin_user = db.query(User).filter(User.email == admin_email).first()
    
    # Blog 1: Arbeitsmöglichkeiten für Bewerber
    if not db.query(BlogPost).filter(BlogPost.slug == "arbeit-in-deutschland-moeglichkeiten").first():
        blog1 = BlogPost(
            title="Arbeiten in Deutschland: Diese Möglichkeiten haben Sie als internationale Fachkraft",
            slug="arbeit-in-deutschland-moeglichkeiten",
            excerpt="Deutschland bietet vielfältige Arbeitsmöglichkeiten für internationale Bewerber. Von Studentenferienjobs über Saisonarbeit bis hin zu Fachkräftepositionen – erfahren Sie, welche Optionen für Sie in Frage kommen.",
            content="""## Arbeiten in Deutschland – Ihr Weg zum Erfolg

Deutschland ist eines der attraktivsten Ziele für internationale Arbeitskräfte. Mit einer starken Wirtschaft, fairen Arbeitsbedingungen und guten Verdienstmöglichkeiten lockt das Land jedes Jahr tausende Bewerber aus aller Welt.

### Studentenferienjobs (bis zu 90 Tage)

Für Studierende aus Nicht-EU-Ländern bieten **Studentenferienjobs** eine hervorragende Möglichkeit, Deutschland kennenzulernen und gleichzeitig Geld zu verdienen. Die wichtigsten Voraussetzungen:

- Immatrikulation an einer anerkannten Hochschule im Heimatland
- Arbeit nur während der vorlesungsfreien Zeit
- Maximale Beschäftigungsdauer: 90 Tage pro Jahr
- Vermittlung über die Zentrale Auslands- und Fachvermittlung (ZAV)

**Typische Branchen:** Landwirtschaft, Gastronomie, Hotellerie, Produktion

### Saisonarbeit

**Saisonarbeiter** werden besonders in der Landwirtschaft und im Tourismus gesucht. Die Beschäftigung ist zeitlich begrenzt und eignet sich für:

- Erntehelfer (Obst, Gemüse, Wein)
- Servicekräfte in Hotels und Restaurants
- Helfer in der Lebensmittelverarbeitung

### Fachkräfte mit Berufsausbildung

Deutschland sucht aktiv nach **qualifizierten Fachkräften**. Mit dem Fachkräfteeinwanderungsgesetz wurden die Hürden deutlich gesenkt. Besonders gefragt sind:

- Handwerker (Elektriker, Installateure, Mechaniker)
- Pflegekräfte
- IT-Spezialisten
- Ingenieure

### Ausbildung in Deutschland

Eine **duale Ausbildung** in Deutschland ist ein Erfolgsmodell, das Theorie und Praxis verbindet. Sie erhalten:

- Vergütung während der Ausbildung
- Anerkannten Berufsabschluss
- Sehr gute Übernahmechancen
- Möglichkeit zur dauerhaften Niederlassung

## Ihr nächster Schritt

Registrieren Sie sich kostenlos bei IJP und lassen Sie sich von uns bei der Jobsuche unterstützen. Wir begleiten Sie von der Bewerbung bis zur Anreise!
""",
            category=BlogCategory.CAREER,
            tags="Arbeiten in Deutschland, Studentenferienjob, Saisonarbeit, Fachkräfte, Ausbildung, Arbeitserlaubnis",
            meta_title="Arbeiten in Deutschland 2025: Alle Möglichkeiten für internationale Bewerber | IJP",
            meta_description="Erfahren Sie, welche Arbeitsmöglichkeiten Deutschland für internationale Bewerber bietet: Studentenferienjobs, Saisonarbeit, Fachkräftestellen und Ausbildungsplätze.",
            meta_keywords="Arbeiten in Deutschland, Arbeit Deutschland Ausländer, Studentenferienjob Deutschland, Saisonarbeit, Fachkräfteeinwanderung",
            is_published=True,
            is_featured=True,
            author_id=admin_user.id,
            published_at=datetime.utcnow()
        )
        db.add(blog1)
        print("✓ Blog erstellt: Arbeitsmöglichkeiten in Deutschland")
    
    # Blog 2: Für Unternehmen - IJP Services
    if not db.query(BlogPost).filter(BlogPost.slug == "ijp-service-fuer-unternehmen").first():
        blog2 = BlogPost(
            title="So unterstützt IJP Ihr Unternehmen: Von der Personalsuche bis zur Anreise",
            slug="ijp-service-fuer-unternehmen",
            excerpt="Als Vermittlungsagentur begleiten wir deutsche Unternehmen beim gesamten Prozess der internationalen Personalgewinnung. Erfahren Sie, wie wir Sie unterstützen.",
            content="""## IJP – Ihr Partner für internationale Fachkräfte

Der Arbeitsmarkt in Deutschland ist angespannt. Viele Unternehmen finden nicht genügend qualifizierte Mitarbeiter. **IJP International Job Placement** bietet Ihnen eine Lösung: Wir vermitteln motivierte und qualifizierte Arbeitskräfte aus dem Ausland – schnell, zuverlässig und rechtssicher.

### Unser Service im Überblick

#### 1. Bedarfsanalyse und Stellenausschreibung

- Gemeinsame Analyse Ihres Personalbedarfs
- Erstellung attraktiver Stellenangebote
- Veröffentlichung auf unserer Plattform und in Partnernetzwerken

#### 2. Kandidatenauswahl und Vorqualifizierung

- Sichtung aller eingehenden Bewerbungen
- **Überprüfung von Dokumenten und Qualifikationen**
- Sprachliche Einschätzung der Bewerber
- Vorauswahl passender Kandidaten

#### 3. Dokumentenservice

Wir übernehmen die komplette **Dokumentenabwicklung**:

- Erstellung der Arbeitsverträge
- Vorbereitung der Unterlagen für die Arbeitsagentur
- Unterstützung bei Visumsanträgen
- Kommunikation mit Behörden

#### 4. Anreise und Onboarding

- Organisation der Anreise (Flug, Transfer)
- Unterstützung bei der Unterkunftssuche
- Begleitung in der Einarbeitungsphase
- Ansprechpartner bei Fragen und Problemen

### Unsere Vorteile für Ihr Unternehmen

| Vorteil | Beschreibung |
|---------|-------------|
| **Zeitersparnis** | Wir übernehmen den kompletten Rekrutierungsprozess |
| **Rechtssicherheit** | Alle Dokumente entsprechen den gesetzlichen Anforderungen |
| **Qualifizierte Bewerber** | Vorgeprüfte Kandidaten mit echtem Interesse |
| **Persönliche Betreuung** | Ein fester Ansprechpartner für Ihr Unternehmen |
| **Faire Konditionen** | Transparente Preisgestaltung ohne versteckte Kosten |

### Branchen, die wir bedienen

- **Landwirtschaft:** Erntehelfer, Saisonarbeiter
- **Gastronomie & Hotellerie:** Servicekräfte, Küchenhilfen
- **Handwerk & Produktion:** Fachkräfte und Helfer
- **Pflege:** Pflegekräfte und Pflegehelfer
- **Logistik:** Lagerarbeiter, Fahrer

## Jetzt Kontakt aufnehmen

Registrieren Sie sich als Unternehmen auf unserer Plattform oder kontaktieren Sie uns direkt. Wir erstellen Ihnen gerne ein individuelles Angebot!
""",
            category=BlogCategory.COMPANY,
            tags="Personalvermittlung, Fachkräftemangel, Recruiting, internationale Mitarbeiter, Arbeitgeberservice",
            meta_title="Internationale Personalvermittlung für Unternehmen | IJP Service",
            meta_description="IJP unterstützt deutsche Unternehmen bei der internationalen Personalgewinnung: Kandidatenauswahl, Dokumentenservice, Visa-Unterstützung und Anreise-Organisation.",
            meta_keywords="Personalvermittlung international, Fachkräfte aus Ausland, Recruiting Osteuropa, Saisonarbeiter vermitteln",
            is_published=True,
            is_featured=True,
            author_id=admin_user.id,
            published_at=datetime.utcnow()
        )
        db.add(blog2)
        print("✓ Blog erstellt: IJP Service für Unternehmen")
    
    # Blog 3: Fachkräftemangel
    if not db.query(BlogPost).filter(BlogPost.slug == "fachkraeftemangel-deutschland-loesungen").first():
        blog3 = BlogPost(
            title="Fachkräftemangel in Deutschland: Ursachen, Auswirkungen und wie IJP gegensteuert",
            slug="fachkraeftemangel-deutschland-loesungen",
            excerpt="Der Fachkräftemangel ist eine der größten wirtschaftlichen Herausforderungen Deutschlands. Erfahren Sie, welche Branchen besonders betroffen sind und wie internationale Arbeitskräfte die Lösung sein können.",
            content="""## Der Fachkräftemangel – Eine nationale Herausforderung

Deutschland steht vor einem der größten Arbeitskräfteprobleme seiner Geschichte. Der **demografische Wandel**, die Digitalisierung und veränderte Arbeitswelten führen dazu, dass in vielen Branchen händeringend Personal gesucht wird.

### Alarmierende Zahlen

- **1,7 Millionen** offene Stellen in Deutschland (Stand 2024)
- **400.000** fehlende Fachkräfte allein im Handwerk
- **200.000** Pflegekräfte fehlen bis 2030
- **Milliardenverluste** für die deutsche Wirtschaft jährlich

### Besonders betroffene Branchen

#### Pflege und Gesundheitswesen
Der Pflegenotstand ist längst Realität. Krankenhäuser und Pflegeheime können Stationen nicht mehr voll besetzen. Die Arbeitsbedingungen verschlechtern sich, was zu weiterer Abwanderung führt.

#### Handwerk und Bau
Elektriker, Installateure, Dachdecker – in nahezu allen Gewerken fehlen Fachkräfte. Aufträge können nicht angenommen werden, Wartezeiten für Kunden steigen.

#### Gastronomie und Hotellerie
Nach der Corona-Pandemie haben viele Fachkräfte die Branche verlassen. Hotels und Restaurants kämpfen mit Personalmangel, was zu eingeschränkten Öffnungszeiten und Qualitätseinbußen führt.

#### Landwirtschaft
Saisonale Arbeitskräfte für Ernte und Verarbeitung werden dringend benötigt. Ohne internationale Helfer würden viele Ernten auf den Feldern verderben.

### Internationale Fachkräfte als Lösung

Die Bundesregierung hat reagiert: Mit dem **Fachkräfteeinwanderungsgesetz** wurden die Hürden für qualifizierte Arbeitskräfte aus dem Ausland gesenkt. Deutschland wirbt aktiv um:

- Fachkräfte mit anerkannter Berufsausbildung
- Akademiker aus MINT-Fächern
- Pflegekräfte mit entsprechender Qualifikation
- Motivierte Auszubildende

### So hilft IJP

**IJP International Job Placement** ist Teil der Lösung. Wir:

✅ **Verbinden** qualifizierte Bewerber aus dem Ausland mit deutschen Unternehmen

✅ **Begleiten** den gesamten Prozess von der Bewerbung bis zur Einarbeitung

✅ **Unterstützen** bei Dokumenten, Visum und Integration

✅ **Schaffen** Win-Win-Situationen für Bewerber und Arbeitgeber

### Unser Beitrag in Zahlen

- Über **30+ Partnerunternehmen** in Deutschland
- Bewerber aus **10+ Ländern**
- Vermittlung in alle wichtigen Branchen
- Persönliche Betreuung für jeden Bewerber

## Gemeinsam gegen den Fachkräftemangel

Der Fachkräftemangel ist eine Chance – für internationale Bewerber, die in Deutschland arbeiten möchten, und für Unternehmen, die offen für neue Wege sind. 

**IJP** ist die Brücke zwischen beiden Welten. Registrieren Sie sich noch heute und werden Sie Teil der Lösung!

---

*Quellen: Bundesagentur für Arbeit, Institut für Arbeitsmarkt- und Berufsforschung (IAB), DIHK-Fachkräftereport 2024*
""",
            category=BlogCategory.NEWS,
            tags="Fachkräftemangel, Arbeitskräfte Deutschland, Demografie, Pflegenotstand, Handwerkermangel, Lösung Fachkräftemangel",
            meta_title="Fachkräftemangel Deutschland 2025: Ursachen & Lösungen | IJP",
            meta_description="Der Fachkräftemangel bedroht Deutschlands Wirtschaft. Erfahren Sie, welche Branchen betroffen sind und wie internationale Arbeitskräfte helfen können.",
            meta_keywords="Fachkräftemangel Deutschland, Arbeitskräftemangel, Pflegenotstand, Handwerker gesucht, internationale Fachkräfte",
            is_published=True,
            is_featured=True,
            author_id=admin_user.id,
            published_at=datetime.utcnow()
        )
        db.add(blog3)
        print("✓ Blog erstellt: Fachkräftemangel in Deutschland")
    
    db.commit()
    
    print("")
    print("=" * 60)
    print("TESTDATEN - LOGIN ÜBERSICHT")
    print("=" * 60)
    print("Admin:    IJP_Admin_001@ijp-portal.de / IJP#Secure2025!")
    print("Bewerber: max@example.com             / bewerber123")
    print("Firma:    firma@example.com           / firma123")
    print("=" * 60)
    print("")
    print("BLOG-EINTRÄGE (SEO-optimiert):")
    print("- Arbeitsmöglichkeiten in Deutschland")
    print("- IJP Service für Unternehmen")
    print("- Fachkräftemangel in Deutschland")
    print("=" * 60)
