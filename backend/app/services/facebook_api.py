"""
Facebook Graph API Service
Ermöglicht das Posten auf Facebook Pages über die offizielle API.
"""

import httpx
from typing import Optional, List
import os
import logging

logger = logging.getLogger(__name__)

# Facebook Graph API Base URL
GRAPH_API_URL = "https://graph.facebook.com/v19.0"

# Umgebungsvariablen
FACEBOOK_PAGE_ID = os.getenv("FACEBOOK_PAGE_ID", "1086507434540518")
FACEBOOK_PAGE_ACCESS_TOKEN = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "")


class FacebookAPIError(Exception):
    """Facebook API Fehler"""
    def __init__(self, message: str, error_code: Optional[int] = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


async def post_to_page(message: str, link: Optional[str] = None) -> dict:
    """
    Postet eine Nachricht auf der Facebook Page.
    
    Args:
        message: Der Post-Text
        link: Optional - Ein Link der geteilt werden soll
        
    Returns:
        dict mit post_id bei Erfolg
    """
    if not FACEBOOK_PAGE_ACCESS_TOKEN:
        raise FacebookAPIError("Facebook Page Access Token nicht konfiguriert")
    
    url = f"{GRAPH_API_URL}/{FACEBOOK_PAGE_ID}/feed"
    
    data = {
        "message": message,
        "access_token": FACEBOOK_PAGE_ACCESS_TOKEN
    }
    
    if link:
        data["link"] = link
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        result = response.json()
        
        if "error" in result:
            error = result["error"]
            logger.error(f"Facebook API Error: {error}")
            raise FacebookAPIError(
                message=error.get("message", "Unbekannter Fehler"),
                error_code=error.get("code")
            )
        
        logger.info(f"Post erfolgreich erstellt: {result.get('id')}")
        return {"success": True, "post_id": result.get("id")}


async def comment_on_post(post_id: str, message: str) -> dict:
    """
    Kommentiert einen Post auf der Facebook Page.
    
    Args:
        post_id: Die ID des Posts (Format: PAGE_ID_POST_ID)
        message: Der Kommentar-Text
        
    Returns:
        dict mit comment_id bei Erfolg
    """
    if not FACEBOOK_PAGE_ACCESS_TOKEN:
        raise FacebookAPIError("Facebook Page Access Token nicht konfiguriert")
    
    url = f"{GRAPH_API_URL}/{post_id}/comments"
    
    data = {
        "message": message,
        "access_token": FACEBOOK_PAGE_ACCESS_TOKEN
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, data=data)
        result = response.json()
        
        if "error" in result:
            error = result["error"]
            logger.error(f"Facebook API Error (Comment): {error}")
            raise FacebookAPIError(
                message=error.get("message", "Unbekannter Fehler"),
                error_code=error.get("code")
            )
        
        logger.info(f"Kommentar erfolgreich erstellt: {result.get('id')}")
        return {"success": True, "comment_id": result.get("id")}


async def post_with_comments(message: str, comments: List[str] = None, link: Optional[str] = None) -> dict:
    """
    Erstellt einen Post und fügt optional Kommentare hinzu.
    
    Args:
        message: Der Post-Text
        comments: Liste von Kommentaren die unter dem Post erscheinen sollen
        link: Optional - Ein Link der geteilt werden soll
        
    Returns:
        dict mit post_id und comment_ids
    """
    # Post erstellen
    post_result = await post_to_page(message, link)
    post_id = post_result.get("post_id")
    
    result = {
        "success": True,
        "post_id": post_id,
        "comments": []
    }
    
    # Kommentare hinzufügen
    if comments and post_id:
        for comment in comments:
            if comment.strip():
                try:
                    comment_result = await comment_on_post(post_id, comment)
                    result["comments"].append({
                        "success": True,
                        "comment_id": comment_result.get("comment_id"),
                        "text": comment[:50] + "..." if len(comment) > 50 else comment
                    })
                except FacebookAPIError as e:
                    result["comments"].append({
                        "success": False,
                        "error": str(e),
                        "text": comment[:50] + "..." if len(comment) > 50 else comment
                    })
    
    return result


async def get_page_info() -> dict:
    """
    Holt Informationen über die Facebook Page.
    
    Returns:
        dict mit Page-Informationen
    """
    if not FACEBOOK_PAGE_ACCESS_TOKEN:
        raise FacebookAPIError("Facebook Page Access Token nicht konfiguriert")
    
    url = f"{GRAPH_API_URL}/{FACEBOOK_PAGE_ID}"
    params = {
        "fields": "id,name,fan_count,followers_count",
        "access_token": FACEBOOK_PAGE_ACCESS_TOKEN
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        result = response.json()
        
        if "error" in result:
            error = result["error"]
            raise FacebookAPIError(
                message=error.get("message", "Unbekannter Fehler"),
                error_code=error.get("code")
            )
        
        return result


async def check_token_validity() -> dict:
    """
    Prüft ob der Access Token gültig ist.
    
    Returns:
        dict mit Token-Status
    """
    if not FACEBOOK_PAGE_ACCESS_TOKEN:
        return {"valid": False, "error": "Token nicht konfiguriert"}
    
    try:
        page_info = await get_page_info()
        return {
            "valid": True,
            "page_name": page_info.get("name"),
            "page_id": page_info.get("id")
        }
    except FacebookAPIError as e:
        return {"valid": False, "error": str(e)}
