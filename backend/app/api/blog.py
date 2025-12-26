from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import re
import os
import uuid
import aiofiles

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.sanitizer import sanitize_html, sanitize_plain_text
from app.models.user import User, UserRole
from app.models.blog import BlogPost, BlogCategory, BLOG_CATEGORY_LABELS
from app.schemas.blog import (
    BlogPostCreate, BlogPostUpdate, BlogPostResponse, 
    BlogPostListResponse, BlogCategoryOption, BlogCategoriesResponse
)

# Upload-Verzeichnis für Blog-Bilder
BLOG_IMAGES_DIR = "uploads/blog"
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/blog", tags=["Blog"])


def create_slug(title: str) -> str:
    """Erstellt einen URL-freundlichen Slug aus dem Titel"""
    # Kleinbuchstaben, Umlaute ersetzen
    slug = title.lower()
    slug = slug.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    # Nur alphanumerische Zeichen und Bindestriche
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # Führende/trailing Bindestriche entfernen
    slug = slug.strip('-')
    return slug


def add_category_label(post: BlogPost) -> dict:
    """Fügt das Kategorie-Label zu einem Post hinzu"""
    post_dict = {
        "id": post.id,
        "title": post.title,
        "slug": post.slug,
        "excerpt": post.excerpt,
        "content": post.content,
        "category": post.category,
        "category_label": BLOG_CATEGORY_LABELS.get(post.category, post.category.value),
        "tags": post.tags,
        "meta_title": post.meta_title,
        "meta_description": post.meta_description,
        "meta_keywords": post.meta_keywords,
        "featured_image": post.featured_image,
        "is_published": post.is_published,
        "is_featured": post.is_featured,
        "author_id": post.author_id,
        "view_count": post.view_count,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "published_at": post.published_at,
        "author": post.author,
    }
    return post_dict


# ========== ÖFFENTLICHE ENDPOINTS ==========

@router.get("/categories", response_model=BlogCategoriesResponse)
async def get_blog_categories():
    """Gibt alle verfügbaren Blog-Kategorien zurück"""
    categories = [
        BlogCategoryOption(value=cat.value, label=label)
        for cat, label in BLOG_CATEGORY_LABELS.items()
    ]
    return BlogCategoriesResponse(categories=categories)


@router.get("/posts", response_model=List[BlogPostListResponse])
async def list_blog_posts(
    category: Optional[BlogCategory] = None,
    featured: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Listet alle veröffentlichten Blog-Posts"""
    query = db.query(BlogPost).filter(BlogPost.is_published == True)
    
    if category:
        query = query.filter(BlogPost.category == category)
    
    if featured is not None:
        query = query.filter(BlogPost.is_featured == featured)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (BlogPost.title.ilike(search_term)) |
            (BlogPost.excerpt.ilike(search_term)) |
            (BlogPost.tags.ilike(search_term))
        )
    
    posts = query.order_by(BlogPost.published_at.desc()).offset(offset).limit(limit).all()
    
    return [
        BlogPostListResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            excerpt=post.excerpt,
            category=post.category,
            category_label=BLOG_CATEGORY_LABELS.get(post.category, post.category.value),
            featured_image=post.featured_image,
            is_published=post.is_published,
            is_featured=post.is_featured,
            view_count=post.view_count,
            published_at=post.published_at,
            created_at=post.created_at
        )
        for post in posts
    ]


@router.get("/posts/{slug}", response_model=BlogPostResponse)
async def get_blog_post(
    slug: str,
    db: Session = Depends(get_db)
):
    """Holt einen Blog-Post anhand des Slugs"""
    post = db.query(BlogPost).filter(
        BlogPost.slug == slug,
        BlogPost.is_published == True
    ).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog-Post nicht gefunden"
        )
    
    # View Count erhöhen
    post.view_count += 1
    db.commit()
    db.refresh(post)
    
    return add_category_label(post)


@router.get("/featured", response_model=List[BlogPostListResponse])
async def get_featured_posts(
    limit: int = Query(3, le=10),
    db: Session = Depends(get_db)
):
    """Holt die Featured Blog-Posts für die Startseite"""
    posts = db.query(BlogPost).filter(
        BlogPost.is_published == True,
        BlogPost.is_featured == True
    ).order_by(BlogPost.published_at.desc()).limit(limit).all()
    
    return [
        BlogPostListResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            excerpt=post.excerpt,
            category=post.category,
            category_label=BLOG_CATEGORY_LABELS.get(post.category, post.category.value),
            featured_image=post.featured_image,
            is_published=post.is_published,
            is_featured=post.is_featured,
            view_count=post.view_count,
            published_at=post.published_at,
            created_at=post.created_at
        )
        for post in posts
    ]


# ========== ADMIN ENDPOINTS ==========

@router.get("/admin/posts", response_model=List[BlogPostListResponse])
async def admin_list_all_posts(
    is_published: Optional[bool] = None,
    category: Optional[BlogCategory] = None,
    limit: int = Query(50, le=100),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Listet alle Blog-Posts (auch unveröffentlichte)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können auf diesen Endpunkt zugreifen"
        )
    
    query = db.query(BlogPost)
    
    if is_published is not None:
        query = query.filter(BlogPost.is_published == is_published)
    
    if category:
        query = query.filter(BlogPost.category == category)
    
    posts = query.order_by(BlogPost.created_at.desc()).offset(offset).limit(limit).all()
    
    return [
        BlogPostListResponse(
            id=post.id,
            title=post.title,
            slug=post.slug,
            excerpt=post.excerpt,
            category=post.category,
            category_label=BLOG_CATEGORY_LABELS.get(post.category, post.category.value),
            featured_image=post.featured_image,
            is_published=post.is_published,
            is_featured=post.is_featured,
            view_count=post.view_count,
            published_at=post.published_at,
            created_at=post.created_at
        )
        for post in posts
    ]


@router.get("/admin/posts/{post_id}", response_model=BlogPostResponse)
async def admin_get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Holt einen einzelnen Post (auch unveröffentlicht)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können auf diesen Endpunkt zugreifen"
        )
    
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog-Post nicht gefunden"
        )
    
    return add_category_label(post)


@router.post("/admin/posts", response_model=BlogPostResponse)
async def create_blog_post(
    post_data: BlogPostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Erstellt einen neuen Blog-Post"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können Blog-Posts erstellen"
        )
    
    # Slug generieren wenn nicht angegeben
    slug = post_data.slug or create_slug(post_data.title)
    
    # Prüfen ob Slug bereits existiert
    existing = db.query(BlogPost).filter(BlogPost.slug == slug).first()
    if existing:
        # Suffix hinzufügen
        slug = f"{slug}-{int(datetime.utcnow().timestamp())}"
    
    # HTML-Content sanitisieren gegen XSS
    sanitized_content = sanitize_html(post_data.content) if post_data.content else None
    sanitized_excerpt = sanitize_plain_text(post_data.excerpt) if post_data.excerpt else None
    
    post = BlogPost(
        title=sanitize_plain_text(post_data.title),
        slug=slug,
        excerpt=sanitized_excerpt,
        content=sanitized_content,
        category=post_data.category,
        tags=post_data.tags,
        meta_title=sanitize_plain_text(post_data.meta_title or post_data.title),
        meta_description=sanitize_plain_text(post_data.meta_description or post_data.excerpt),
        meta_keywords=post_data.meta_keywords,
        featured_image=post_data.featured_image,
        is_published=post_data.is_published,
        is_featured=post_data.is_featured,
        author_id=current_user.id,
        published_at=datetime.utcnow() if post_data.is_published else None
    )
    
    db.add(post)
    db.commit()
    db.refresh(post)
    
    return add_category_label(post)


@router.put("/admin/posts/{post_id}", response_model=BlogPostResponse)
async def update_blog_post(
    post_id: int,
    post_data: BlogPostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Aktualisiert einen Blog-Post"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können Blog-Posts bearbeiten"
        )
    
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog-Post nicht gefunden"
        )
    
    update_data = post_data.dict(exclude_unset=True)
    
    # HTML-Content sanitisieren gegen XSS
    if 'content' in update_data and update_data['content']:
        update_data['content'] = sanitize_html(update_data['content'])
    if 'title' in update_data and update_data['title']:
        update_data['title'] = sanitize_plain_text(update_data['title'])
    if 'excerpt' in update_data and update_data['excerpt']:
        update_data['excerpt'] = sanitize_plain_text(update_data['excerpt'])
    if 'meta_title' in update_data and update_data['meta_title']:
        update_data['meta_title'] = sanitize_plain_text(update_data['meta_title'])
    if 'meta_description' in update_data and update_data['meta_description']:
        update_data['meta_description'] = sanitize_plain_text(update_data['meta_description'])
    
    # Wenn veröffentlicht wird und noch kein published_at
    if update_data.get('is_published') and not post.published_at:
        update_data['published_at'] = datetime.utcnow()
    
    # Slug aktualisieren wenn Titel geändert
    if 'title' in update_data and 'slug' not in update_data:
        update_data['slug'] = create_slug(update_data['title'])
    
    for key, value in update_data.items():
        setattr(post, key, value)
    
    db.commit()
    db.refresh(post)
    
    return add_category_label(post)


@router.delete("/admin/posts/{post_id}")
async def delete_blog_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Löscht einen Blog-Post"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können Blog-Posts löschen"
        )
    
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog-Post nicht gefunden"
        )
    
    db.delete(post)
    db.commit()
    
    return {"message": "Blog-Post gelöscht"}


@router.post("/admin/posts/{post_id}/toggle-publish")
async def toggle_publish_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin: Veröffentlicht/Versteckt einen Blog-Post"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können Blog-Posts veröffentlichen"
        )
    
    post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
    
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Blog-Post nicht gefunden"
        )
    
    post.is_published = not post.is_published
    if post.is_published and not post.published_at:
        post.published_at = datetime.utcnow()
    
    db.commit()
    db.refresh(post)
    
    return {
        "message": "Veröffentlicht" if post.is_published else "Versteckt",
        "is_published": post.is_published
    }


@router.post("/admin/upload-image")
async def upload_blog_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Admin: Lädt ein Bild für Blog-Posts hoch.
    Gibt die URL zum hochgeladenen Bild zurück.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nur Admins können Bilder hochladen"
        )
    
    # Dateityp prüfen
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültiger Dateityp. Erlaubt: JPG, PNG, GIF, WebP"
        )
    
    # Dateigröße prüfen
    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datei zu groß. Maximum: 5 MB"
        )
    
    # Verzeichnis erstellen falls nicht vorhanden
    os.makedirs(BLOG_IMAGES_DIR, exist_ok=True)
    
    # Eindeutigen Dateinamen generieren
    file_ext = os.path.splitext(file.filename)[1].lower()
    if not file_ext:
        file_ext = ".jpg"  # Default
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(BLOG_IMAGES_DIR, unique_filename)
    
    # Datei speichern
    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(contents)
    
    # URL zurückgeben
    return {
        "success": True,
        "url": f"/api/v1/blog/images/{unique_filename}",
        "filename": unique_filename
    }


@router.get("/images/{filename}")
async def get_blog_image(filename: str):
    """Gibt ein Blog-Bild zurück"""
    file_path = os.path.join(BLOG_IMAGES_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bild nicht gefunden"
        )
    
    return FileResponse(file_path)
