from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.facebook_post import FacebookGroup, FacebookPostTemplate, FacebookPost, FacebookPostLog
from app.services.facebook_api import (
    post_to_page, comment_on_post, post_with_comments, 
    get_page_info, check_token_validity, FacebookAPIError
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/facebook", tags=["Facebook"])


# ============ Pydantic Schemas ============

class GroupCreate(BaseModel):
    name: str
    url: str
    facebook_group_id: Optional[str] = None
    type: str = "external"
    members: int = 0
    notes: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    facebook_group_id: Optional[str] = None
    type: Optional[str] = None
    members: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    url: str
    facebook_group_id: Optional[str]
    type: str
    members: int
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    name: str
    content: str
    category: Optional[str] = None


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    content: str
    category: Optional[str]
    is_default: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    title: Optional[str] = None
    content: str
    template_id: Optional[int] = None
    variables: Optional[dict] = None
    is_favorite: bool = False


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_favorite: Optional[bool] = None


class PostResponse(BaseModel):
    id: int
    title: Optional[str]
    content: str
    template_id: Optional[int]
    variables: Optional[dict]
    is_favorite: bool
    times_used: int
    created_at: datetime

    class Config:
        from_attributes = True


class PostLogCreate(BaseModel):
    post_id: Optional[int] = None
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    content: str
    status: str = "manual"


class PostLogResponse(BaseModel):
    id: int
    post_id: Optional[int]
    group_id: Optional[int]
    group_name: Optional[str]
    content: str
    status: str
    posted_at: datetime

    class Config:
        from_attributes = True


# ============ Helper ============

def require_admin(user: User):
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Nur für Admins")


# ============ Groups Endpoints ============

@router.get("/groups", response_model=List[GroupResponse])
async def get_groups(
    type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    query = db.query(FacebookGroup).filter(FacebookGroup.is_active == True)
    if type:
        query = query.filter(FacebookGroup.type == type)
    return query.order_by(FacebookGroup.type, FacebookGroup.name).all()


@router.post("/groups", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_group = FacebookGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    group: GroupUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_group = db.query(FacebookGroup).filter(FacebookGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    for key, value in group.dict(exclude_unset=True).items():
        setattr(db_group, key, value)
    
    db.commit()
    db.refresh(db_group)
    return db_group


@router.delete("/groups/{group_id}")
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_group = db.query(FacebookGroup).filter(FacebookGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    db_group.is_active = False
    db.commit()
    return {"message": "Gruppe gelöscht"}


# ============ Templates Endpoints ============

@router.get("/templates", response_model=List[TemplateResponse])
async def get_templates(
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    query = db.query(FacebookPostTemplate)
    if category:
        query = query.filter(FacebookPostTemplate.category == category)
    return query.order_by(desc(FacebookPostTemplate.is_default), FacebookPostTemplate.name).all()


@router.post("/templates", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_template = FacebookPostTemplate(**template.dict())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template: TemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_template = db.query(FacebookPostTemplate).filter(FacebookPostTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    for key, value in template.dict(exclude_unset=True).items():
        setattr(db_template, key, value)
    
    db.commit()
    db.refresh(db_template)
    return db_template


@router.delete("/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_template = db.query(FacebookPostTemplate).filter(FacebookPostTemplate.id == template_id).first()
    if not db_template:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden")
    
    db.delete(db_template)
    db.commit()
    return {"message": "Vorlage gelöscht"}


# ============ Posts Endpoints ============

@router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    favorites_only: bool = False,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    query = db.query(FacebookPost)
    if favorites_only:
        query = query.filter(FacebookPost.is_favorite == True)
    return query.order_by(desc(FacebookPost.is_favorite), desc(FacebookPost.created_at)).limit(limit).all()


@router.post("/posts", response_model=PostResponse)
async def create_post(
    post: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_post = FacebookPost(**post.dict())
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post


@router.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    post: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_post = db.query(FacebookPost).filter(FacebookPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post nicht gefunden")
    
    for key, value in post.dict(exclude_unset=True).items():
        setattr(db_post, key, value)
    
    db.commit()
    db.refresh(db_post)
    return db_post


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_post = db.query(FacebookPost).filter(FacebookPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post nicht gefunden")
    
    db.delete(db_post)
    db.commit()
    return {"message": "Post gelöscht"}


@router.post("/posts/{post_id}/use")
async def mark_post_used(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Erhöht den Nutzungszähler eines Posts"""
    require_admin(current_user)
    db_post = db.query(FacebookPost).filter(FacebookPost.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post nicht gefunden")
    
    db_post.times_used += 1
    db.commit()
    return {"times_used": db_post.times_used}


# ============ Post Logs Endpoints ============

@router.get("/logs", response_model=List[PostLogResponse])
async def get_post_logs(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    return db.query(FacebookPostLog).order_by(desc(FacebookPostLog.posted_at)).limit(limit).all()


@router.post("/logs", response_model=PostLogResponse)
async def create_post_log(
    log: PostLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    db_log = FacebookPostLog(**log.dict())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log


# ============ Stats Endpoint ============

@router.get("/stats")
async def get_facebook_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    
    own_groups = db.query(FacebookGroup).filter(
        FacebookGroup.is_active == True,
        FacebookGroup.type == "own"
    ).count()
    
    external_groups = db.query(FacebookGroup).filter(
        FacebookGroup.is_active == True,
        FacebookGroup.type == "external"
    ).count()
    
    total_posts = db.query(FacebookPost).count()
    favorite_posts = db.query(FacebookPost).filter(FacebookPost.is_favorite == True).count()
    total_logs = db.query(FacebookPostLog).count()
    
    return {
        "own_groups": own_groups,
        "external_groups": external_groups,
        "total_groups": own_groups + external_groups,
        "total_posts": total_posts,
        "favorite_posts": favorite_posts,
        "total_posted": total_logs
    }


# ============ Facebook Page API Endpoints ============

class PagePostRequest(BaseModel):
    message: str
    comments: Optional[List[str]] = None
    link: Optional[str] = None


class PagePostResponse(BaseModel):
    success: bool
    post_id: Optional[str] = None
    comments: Optional[List[dict]] = None
    error: Optional[str] = None


@router.get("/page/status")
async def get_page_status(
    current_user: User = Depends(get_current_user)
):
    """Prüft ob die Facebook Page API konfiguriert und der Token gültig ist."""
    require_admin(current_user)
    
    result = await check_token_validity()
    return result


@router.get("/page/info")
async def get_facebook_page_info(
    current_user: User = Depends(get_current_user)
):
    """Holt Informationen über die verknüpfte Facebook Page."""
    require_admin(current_user)
    
    try:
        info = await get_page_info()
        return {"success": True, **info}
    except FacebookAPIError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/page/post", response_model=PagePostResponse)
async def post_to_facebook_page(
    request: PagePostRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Postet direkt auf die Facebook Page (über die offizielle API).
    Optional können Kommentare unter dem Post hinzugefügt werden.
    """
    require_admin(current_user)
    
    try:
        if request.comments:
            result = await post_with_comments(
                message=request.message,
                comments=request.comments,
                link=request.link
            )
        else:
            result = await post_to_page(
                message=request.message,
                link=request.link
            )
        
        # Log erstellen
        log = FacebookPostLog(
            group_name="JobOn Page (API)",
            post_content=request.message[:500],
            success=True,
            facebook_post_id=result.get("post_id")
        )
        db.add(log)
        db.commit()
        
        return PagePostResponse(
            success=True,
            post_id=result.get("post_id"),
            comments=result.get("comments")
        )
        
    except FacebookAPIError as e:
        logger.error(f"Facebook API Error: {e}")
        
        # Fehler-Log erstellen
        log = FacebookPostLog(
            group_name="JobOn Page (API)",
            post_content=request.message[:500],
            success=False,
            error_message=str(e)
        )
        db.add(log)
        db.commit()
        
        return PagePostResponse(
            success=False,
            error=str(e)
        )
