from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.blog import BlogCategory


class BlogPostBase(BaseModel):
    title: str
    slug: Optional[str] = None  # Wird automatisch generiert wenn nicht angegeben
    excerpt: Optional[str] = None
    content: str
    category: BlogCategory = BlogCategory.NEWS
    tags: Optional[str] = None
    
    # SEO
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    
    # Medien
    featured_image: Optional[str] = None
    image_position: Optional[str] = "50,50"  # Bildposition als "x,y" in Prozent
    
    # Status
    is_published: bool = False
    is_featured: bool = False


class BlogPostCreate(BlogPostBase):
    pass


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[BlogCategory] = None
    tags: Optional[str] = None
    
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: Optional[str] = None
    
    featured_image: Optional[str] = None
    image_position: Optional[str] = None
    
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None


class AuthorInfo(BaseModel):
    id: int
    email: str
    
    class Config:
        from_attributes = True


class BlogPostResponse(BlogPostBase):
    id: int
    author_id: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    author: Optional[AuthorInfo] = None
    category_label: Optional[str] = None
    
    class Config:
        from_attributes = True


class BlogPostListResponse(BaseModel):
    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    category: BlogCategory
    category_label: str
    featured_image: Optional[str] = None
    image_position: Optional[str] = "50,50"
    is_published: bool = False  # Hinzugefügt für Admin-Übersicht
    is_featured: bool
    view_count: int
    published_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class BlogCategoryOption(BaseModel):
    value: str
    label: str


class BlogCategoriesResponse(BaseModel):
    categories: List[BlogCategoryOption]
