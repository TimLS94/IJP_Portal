from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class BlogCategory(str, enum.Enum):
    """Blog-Kategorien für SEO und Organisation"""
    NEWS = "news"                        # Neuigkeiten
    TIPS = "tips"                        # Tipps & Tricks
    CAREER = "career"                    # Karriere-Ratgeber
    VISA = "visa"                        # Visa & Arbeitserlaubnis
    LIVING = "living"                    # Leben in Deutschland
    SUCCESS_STORIES = "success_stories"  # Erfolgsgeschichten
    COMPANY = "company"                  # Für Unternehmen


# Labels für Kategorien
BLOG_CATEGORY_LABELS = {
    BlogCategory.NEWS: "Neuigkeiten",
    BlogCategory.TIPS: "Tipps & Tricks",
    BlogCategory.CAREER: "Karriere-Ratgeber",
    BlogCategory.VISA: "Visa & Arbeitserlaubnis",
    BlogCategory.LIVING: "Leben in Deutschland",
    BlogCategory.SUCCESS_STORIES: "Erfolgsgeschichten",
    BlogCategory.COMPANY: "Für Unternehmen",
}


class BlogPost(Base):
    __tablename__ = "blog_posts"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Grunddaten
    title = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, unique=True, index=True)  # URL-freundlicher Titel
    
    # Inhalt
    excerpt = Column(Text)  # Kurzbeschreibung für Vorschau
    content = Column(Text, nullable=False)  # Markdown-Inhalt
    
    # Kategorisierung
    category = Column(Enum(BlogCategory), default=BlogCategory.NEWS)
    tags = Column(String(500))  # Komma-getrennte Tags
    
    # SEO
    meta_title = Column(String(255))  # SEO Titel (wenn anders als Titel)
    meta_description = Column(String(500))  # SEO Beschreibung
    meta_keywords = Column(String(500))  # SEO Keywords
    
    # Medien
    featured_image = Column(String(500))  # Hauptbild URL
    
    # Status
    is_published = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)  # Auf Startseite zeigen
    
    # Autor
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Statistiken
    view_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime)  # Wann veröffentlicht
    
    # Relationships
    author = relationship("User", backref="blog_posts")
