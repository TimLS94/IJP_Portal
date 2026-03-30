from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class FacebookGroup(Base):
    __tablename__ = "facebook_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    facebook_group_id = Column(String(100), nullable=True)  # Für API-Integration
    type = Column(String(50), default="external")  # 'own' oder 'external'
    members = Column(Integer, default=0)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FacebookPostTemplate(Base):
    __tablename__ = "facebook_post_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=True)  # z.B. 'job', 'seasonal', 'general'
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FacebookPost(Base):
    __tablename__ = "facebook_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=True)  # Optionaler Titel zur Identifikation
    content = Column(Text, nullable=False)
    template_id = Column(Integer, nullable=True)  # Referenz zur Vorlage (optional)
    variables = Column(JSON, nullable=True)  # Gespeicherte Variablen-Werte
    is_favorite = Column(Boolean, default=False)
    times_used = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FacebookPostLog(Base):
    __tablename__ = "facebook_post_logs"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, nullable=True)
    group_id = Column(Integer, nullable=True)
    group_name = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    status = Column(String(50), default="manual")  # 'manual', 'api_success', 'api_failed'
    facebook_post_id = Column(String(100), nullable=True)  # ID vom Facebook API Response
    error_message = Column(Text, nullable=True)
    posted_at = Column(DateTime(timezone=True), server_default=func.now())
