from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserRole
from app.models.facebook_post import FacebookGroup, FacebookPostTemplate, FacebookPost, FacebookPostLog, FacebookJobPost
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
    cluster: Optional[str] = None
    members: int = 0
    notes: Optional[str] = None


class GroupUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    facebook_group_id: Optional[str] = None
    type: Optional[str] = None
    cluster: Optional[str] = None
    members: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class GroupResponse(BaseModel):
    id: int
    name: str
    url: str
    facebook_group_id: Optional[str]
    type: str
    cluster: Optional[str]
    members: int
    notes: Optional[str]
    last_posted_at: Optional[datetime]
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
    kind: str = "post"  # 'post' | 'comment'
    template_id: Optional[int] = None
    variables: Optional[dict] = None
    is_favorite: bool = False


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    kind: Optional[str] = None
    is_favorite: Optional[bool] = None


class PostResponse(BaseModel):
    id: int
    title: Optional[str]
    content: str
    kind: str = "post"
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

@router.get("/groups/clusters")
async def get_group_clusters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Gibt alle verfügbaren Cluster zurück"""
    require_admin(current_user)
    clusters = db.query(FacebookGroup.cluster).filter(
        FacebookGroup.is_active == True,
        FacebookGroup.cluster != None,
        FacebookGroup.cluster != ""
    ).distinct().all()
    return [c[0] for c in clusters if c[0]]


@router.get("/groups", response_model=List[GroupResponse])
async def get_groups(
    type: Optional[str] = None,
    cluster: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    query = db.query(FacebookGroup).filter(FacebookGroup.is_active == True)
    if type:
        query = query.filter(FacebookGroup.type == type)
    if cluster:
        query = query.filter(FacebookGroup.cluster == cluster)
    return query.order_by(FacebookGroup.cluster, FacebookGroup.name).all()


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
    kind: Optional[str] = None,  # 'post' | 'comment'
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    require_admin(current_user)
    query = db.query(FacebookPost)
    if favorites_only:
        query = query.filter(FacebookPost.is_favorite == True)
    if kind:
        # Bestehende Einträge ohne kind als 'post' behandeln
        if kind == "post":
            query = query.filter((FacebookPost.kind == "post") | (FacebookPost.kind == None))
        else:
            query = query.filter(FacebookPost.kind == kind)
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


# ============ Boost-Stellen -> FB-Post (DE/ES) ============

def _serialize_job_post(job, cached: Optional[FacebookJobPost]):
    company_name = None
    if getattr(job, "is_external", False) and getattr(job, "external_employer_name", None):
        company_name = job.external_employer_name
    elif getattr(job, "company", None):
        company_name = job.company.company_name
    from app.services.facebook_post_generator import build_comment_text
    return {
        "job_id": job.id,
        "title": job.title,
        "employer": company_name or "Arbeitgeber",
        "location": job.location,
        "url": f"https://www.jobon.work/jobs/{job.slug}-{job.id}" if job.slug else f"https://www.jobon.work/jobs/{job.id}",
        "content_de": cached.content_de if cached else None,
        "content_es": cached.content_es if cached else None,
        "comment_text": (cached.comment_text if cached else None) or build_comment_text(job),
        "generated": bool(cached and cached.content_de),
        "boost_emails_sent_at": cached.boost_emails_sent_at.isoformat() if (cached and cached.boost_emails_sent_at) else None,
        "boost_emails_count": (cached.boost_emails_count if cached else 0) or 0,
    }


@router.get("/boosted-jobs")
async def get_boosted_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aktuell hervorgehobene/geboostete Stellen mit (ggf. gecachtem) FB-Post."""
    require_admin(current_user)
    from app.models.job_posting import JobPosting
    from sqlalchemy import or_
    now = datetime.utcnow()
    boost_cutoff = now - timedelta(days=30)
    jobs = (
        db.query(JobPosting)
        .filter(
            JobPosting.is_active == True,
            JobPosting.is_draft == False,
            JobPosting.is_archived == False,
            or_(
                JobPosting.is_featured == True,
                JobPosting.last_boosted_at >= boost_cutoff,
            ),
        )
        .order_by(desc(JobPosting.last_boosted_at), desc(JobPosting.created_at))
        .all()
    )
    # featured_until prüfen: hervorgehobene mit abgelaufenem Datum raus,
    # kürzlich geboostete bleiben drin
    def _still_relevant(j):
        if j.last_boosted_at and j.last_boosted_at.replace(tzinfo=None) >= boost_cutoff:
            return True
        if j.is_featured and (not j.featured_until or j.featured_until.replace(tzinfo=None) > now):
            return True
        return False
    jobs = [j for j in jobs if _still_relevant(j)]

    cached_map = {
        c.job_id: c for c in db.query(FacebookJobPost).filter(
            FacebookJobPost.job_id.in_([j.id for j in jobs] or [0])
        ).all()
    }
    return {"jobs": [_serialize_job_post(j, cached_map.get(j.id)) for j in jobs]}


@router.post("/boosted-jobs/{job_id}/generate")
async def generate_boosted_job_post(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generiert (oder erneuert) den DE/ES-Facebook-Post für eine Stelle via KI."""
    require_admin(current_user)
    from app.models.job_posting import JobPosting
    from app.services.facebook_post_generator import generate_job_post

    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")

    try:
        result = generate_job_post(job)
    except Exception as e:
        logger.error(f"FB-Post-Generierung fehlgeschlagen (Job {job_id}): {e}")
        raise HTTPException(status_code=502, detail=f"KI-Generierung fehlgeschlagen: {e}")

    cached = db.query(FacebookJobPost).filter(FacebookJobPost.job_id == job_id).first()
    if not cached:
        cached = FacebookJobPost(job_id=job_id)
        db.add(cached)
    cached.content_de = result["de"]
    cached.content_es = result["es"]
    cached.comment_text = result["comment"]
    db.commit()
    db.refresh(cached)
    return _serialize_job_post(job, cached)


@router.post("/boosted-jobs/{job_id}/send-emails")
async def send_boost_emails(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Versendet die Boost-E-Mail (englisch) manuell an passende Bewerber."""
    require_admin(current_user)
    from app.models.job_posting import JobPosting
    from app.services.job_notification_service import send_boost_emails_for_job

    job = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Stelle nicht gefunden")

    result = send_boost_emails_for_job(job, db)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    # Versand protokollieren (Zeitpunkt + Anzahl) am gecachten Job-Post
    cached = db.query(FacebookJobPost).filter(FacebookJobPost.job_id == job_id).first()
    if not cached:
        cached = FacebookJobPost(job_id=job_id)
        db.add(cached)
    cached.boost_emails_sent_at = datetime.utcnow()
    cached.boost_emails_count = result.get("sent", 0)
    db.commit()

    result["sent_at"] = cached.boost_emails_sent_at.isoformat()
    return result
