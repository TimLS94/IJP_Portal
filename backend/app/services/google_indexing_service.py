"""
Google Indexing API Service

Automatische Indexierungsanfragen an Google senden, wenn neue Jobs erstellt oder aktiviert werden.

Setup-Anleitung:
1. Google Cloud Console: https://console.cloud.google.com/
2. Neues Projekt erstellen oder bestehendes verwenden
3. "Indexing API" aktivieren
4. Service Account erstellen (IAM & Admin > Service Accounts)
5. JSON-Key herunterladen
6. In Search Console: Service Account E-Mail als Inhaber hinzufügen
7. JSON-Key als GOOGLE_INDEXING_CREDENTIALS Environment Variable setzen (Base64-encoded)
   oder als Datei unter dem Pfad in GOOGLE_INDEXING_CREDENTIALS_FILE
"""

import os
import json
import base64
import logging
from typing import Optional, Literal
import httpx

logger = logging.getLogger(__name__)

# Google Indexing API Endpoint
INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
TOKEN_URL = "https://oauth2.googleapis.com/token"

class GoogleIndexingService:
    """Service für Google Indexing API Anfragen"""
    
    def __init__(self):
        self.credentials = self._load_credentials()
        self._access_token = None
        self._token_expiry = 0
    
    def _load_credentials(self) -> Optional[dict]:
        """Lädt Google Service Account Credentials"""
        # Option 1: Base64-encoded JSON in Environment Variable
        creds_b64 = os.getenv("GOOGLE_INDEXING_CREDENTIALS")
        if creds_b64:
            try:
                creds_json = base64.b64decode(creds_b64).decode('utf-8')
                return json.loads(creds_json)
            except Exception as e:
                logger.error(f"Fehler beim Laden der Google Credentials (Base64): {e}")
                return None
        
        # Option 2: Pfad zu JSON-Datei
        creds_file = os.getenv("GOOGLE_INDEXING_CREDENTIALS_FILE")
        if creds_file and os.path.exists(creds_file):
            try:
                with open(creds_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Fehler beim Laden der Google Credentials (Datei): {e}")
                return None
        
        logger.warning("Google Indexing API: Keine Credentials konfiguriert")
        return None
    
    def is_configured(self) -> bool:
        """Prüft ob der Service konfiguriert ist"""
        return self.credentials is not None
    
    async def _get_access_token(self) -> Optional[str]:
        """Holt oder erneuert den Access Token"""
        import time
        from jose import jwt
        
        if not self.credentials:
            return None
        
        # Token noch gültig?
        if self._access_token and time.time() < self._token_expiry - 60:
            return self._access_token
        
        try:
            # JWT erstellen
            now = int(time.time())
            payload = {
                "iss": self.credentials["client_email"],
                "scope": "https://www.googleapis.com/auth/indexing",
                "aud": TOKEN_URL,
                "iat": now,
                "exp": now + 3600
            }
            
            # Mit Private Key signieren
            signed_jwt = jwt.encode(
                payload,
                self.credentials["private_key"],
                algorithm="RS256"
            )
            
            # Token anfordern
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    TOKEN_URL,
                    data={
                        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "assertion": signed_jwt
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self._access_token = data["access_token"]
                    self._token_expiry = now + data.get("expires_in", 3600)
                    return self._access_token
                else:
                    logger.error(f"Google Token-Anfrage fehlgeschlagen: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Fehler beim Abrufen des Google Access Tokens: {e}")
            return None
    
    async def request_indexing(
        self, 
        url: str, 
        action: Literal["URL_UPDATED", "URL_DELETED"] = "URL_UPDATED"
    ) -> bool:
        """
        Sendet eine Indexierungsanfrage an Google.
        
        Args:
            url: Die vollständige URL der Seite
            action: "URL_UPDATED" für neue/geänderte Seiten, "URL_DELETED" für gelöschte
            
        Returns:
            True wenn erfolgreich, False bei Fehler
        """
        if not self.is_configured():
            logger.debug("Google Indexing API nicht konfiguriert - überspringe")
            return False
        
        token = await self._get_access_token()
        if not token:
            logger.error("Konnte keinen Access Token für Google Indexing API erhalten")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    INDEXING_API_URL,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "url": url,
                        "type": action
                    }
                )
                
                if response.status_code == 200:
                    logger.info(f"✅ Google Indexierung beantragt: {url}")
                    return True
                else:
                    logger.warning(f"Google Indexierung fehlgeschlagen ({response.status_code}): {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Fehler bei Google Indexierungsanfrage: {e}")
            return False
    
    async def index_job(self, job_slug: str, job_id: int) -> bool:
        """
        Beantragt Indexierung für eine Job-Seite.
        
        Args:
            job_slug: Der URL-Slug des Jobs
            job_id: Die Job-ID
            
        Returns:
            True wenn erfolgreich
        """
        url = f"https://www.jobon.work/jobs/{job_slug}-{job_id}"
        return await self.request_indexing(url, "URL_UPDATED")
    
    async def remove_job_from_index(self, job_slug: str, job_id: int) -> bool:
        """
        Beantragt Entfernung einer Job-Seite aus dem Index.
        
        Args:
            job_slug: Der URL-Slug des Jobs
            job_id: Die Job-ID
            
        Returns:
            True wenn erfolgreich
        """
        url = f"https://www.jobon.work/jobs/{job_slug}-{job_id}"
        return await self.request_indexing(url, "URL_DELETED")


# Singleton-Instanz
google_indexing_service = GoogleIndexingService()
