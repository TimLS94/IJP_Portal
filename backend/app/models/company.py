from sqlalchemy import Column, Integer, String, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

# Standard Absage-Text (rechtlich sicher formuliert)
DEFAULT_REJECTION_SUBJECT = "Ihre Bewerbung bei {company_name}"
DEFAULT_REJECTION_TEXT = """{salutation},

vielen Dank für Ihr Interesse an einer Tätigkeit bei {company_name} und die Zeit, die Sie in Ihre Bewerbung investiert haben.

Nach sorgfältiger Prüfung aller eingegangenen Bewerbungen müssen wir Ihnen leider mitteilen, dass wir uns für andere Kandidaten entschieden haben, deren Profile noch etwas besser zu unseren aktuellen Anforderungen passen.

Diese Entscheidung ist uns nicht leicht gefallen, da wir viele qualifizierte Bewerbungen erhalten haben. Bitte verstehen Sie, dass es oft nur kleine Nuancen sind, die den Ausschlag geben.

Wir wünschen Ihnen für Ihre berufliche Zukunft alles Gute und viel Erfolg bei der weiteren Stellensuche.

Mit freundlichen Grüßen
{company_name}"""


class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    # Firmendaten
    company_name = Column(String(255), nullable=False)
    contact_person = Column(String(200))
    
    # Adresse
    street = Column(String(255))
    house_number = Column(String(20))
    postal_code = Column(String(20))
    city = Column(String(100))
    country = Column(String(100))
    
    # Kontakt
    phone = Column(String(50))
    website = Column(String(255))
    
    # Beschreibung
    description = Column(Text)
    industry = Column(String(100))
    company_size = Column(String(50))  # z.B. "1-10", "11-50", "51-200", etc.
    
    # Logo
    logo = Column(String(255))
    
    # Absage-E-Mail Einstellungen
    rejection_email_enabled = Column(Boolean, default=True)  # Absage-E-Mail aktiviert?
    rejection_email_subject = Column(String(255), default=DEFAULT_REJECTION_SUBJECT)
    rejection_email_text = Column(Text, default=DEFAULT_REJECTION_TEXT)
    
    # Relationships
    user = relationship("User", back_populates="company")
    job_postings = relationship("JobPosting", back_populates="company")
    members = relationship("CompanyMember", back_populates="company")
    company_requests = relationship("CompanyRequest", back_populates="company")
