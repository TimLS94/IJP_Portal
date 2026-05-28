"""
Storage Service - Cloudflare R2 (S3-kompatibel)

Speichert Dokumente persistent in der Cloud statt lokal.
Fallback auf lokales Filesystem wenn R2 nicht konfiguriert ist.
"""
import os
import uuid
import logging
from typing import Optional, Tuple
from io import BytesIO

logger = logging.getLogger(__name__)

# Versuche boto3 zu importieren (für S3/R2)
try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except ImportError:
    BOTO3_AVAILABLE = False
    logger.warning("boto3 nicht installiert - verwende lokalen Storage")


class StorageService:
    """
    Abstrahiert File-Storage für lokales Filesystem oder Cloudflare R2.
    
    Konfiguration über Environment-Variablen:
    - R2_ACCOUNT_ID: Cloudflare Account ID
    - R2_ACCESS_KEY_ID: R2 Access Key
    - R2_SECRET_ACCESS_KEY: R2 Secret Key
    - R2_BUCKET_NAME: Name des Buckets (default: jobon-documents)
    """
    
    def __init__(self):
        self.use_r2 = False
        self.s3_client = None
        
        # Lade Config aus settings (die lädt aus Environment Variables)
        from app.core.config import settings
        
        self.bucket_name = settings.R2_BUCKET_NAME or 'jobon-documents'
        r2_account_id = settings.R2_ACCOUNT_ID
        r2_access_key = settings.R2_ACCESS_KEY_ID
        r2_secret_key = settings.R2_SECRET_ACCESS_KEY
        
        logger.info(f"Storage Init - R2_ACCOUNT_ID: {'✓' if r2_account_id else '✗'}")
        logger.info(f"Storage Init - R2_ACCESS_KEY_ID: {'✓' if r2_access_key else '✗'}")
        logger.info(f"Storage Init - R2_SECRET_ACCESS_KEY: {'✓' if r2_secret_key else '✗'}")
        
        if BOTO3_AVAILABLE and r2_account_id and r2_access_key and r2_secret_key:
            try:
                # R2 Endpoint
                endpoint_url = f"https://{r2_account_id}.r2.cloudflarestorage.com"
                
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=endpoint_url,
                    aws_access_key_id=r2_access_key,
                    aws_secret_access_key=r2_secret_key,
                    config=Config(
                        signature_version='s3v4',
                        retries={'max_attempts': 3}
                    )
                )
                
                # Test-Verbindung - prüfe nur den spezifischen Bucket (nicht list_buckets!)
                self.s3_client.head_bucket(Bucket=self.bucket_name)
                self.use_r2 = True
                logger.info(f"✅ Cloudflare R2 Storage aktiv (Bucket: {self.bucket_name})")
                
            except Exception as e:
                logger.error(f"❌ R2-Verbindung fehlgeschlagen: {e}")
                self.use_r2 = False
        else:
            logger.info("📁 Lokaler Storage aktiv (R2 nicht konfiguriert)")
    
    def _get_r2_key(self, applicant_id: int, filename: str) -> str:
        """Generiert den S3/R2 Key (Pfad im Bucket)"""
        return f"documents/{applicant_id}/{filename}"
    
    async def upload_file(
        self,
        file_content: bytes,
        applicant_id: int,
        filename: str,
        content_type: str = 'application/pdf'
    ) -> Tuple[bool, str, str]:
        """
        Lädt eine Datei hoch.
        
        Returns:
            Tuple[success, file_path_or_key, error_message]
        """
        if self.use_r2:
            return await self._upload_to_r2(file_content, applicant_id, filename, content_type)
        else:
            return await self._upload_to_local(file_content, applicant_id, filename)
    
    async def _upload_to_r2(
        self,
        file_content: bytes,
        applicant_id: int,
        filename: str,
        content_type: str
    ) -> Tuple[bool, str, str]:
        """Upload zu Cloudflare R2"""
        try:
            key = self._get_r2_key(applicant_id, filename)
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=file_content,
                ContentType=content_type
            )
            
            logger.info(f"✅ Datei zu R2 hochgeladen: {key}")
            return True, key, ""
            
        except ClientError as e:
            error_msg = f"R2 Upload-Fehler: {e}"
            logger.error(error_msg)
            return False, "", error_msg
        except Exception as e:
            error_msg = f"Unerwarteter Upload-Fehler: {e}"
            logger.error(error_msg)
            return False, "", error_msg
    
    async def _upload_to_local(
        self,
        file_content: bytes,
        applicant_id: int,
        filename: str
    ) -> Tuple[bool, str, str]:
        """Upload zu lokalem Filesystem"""
        try:
            from app.core.config import settings
            import aiofiles
            
            # Verzeichnis erstellen
            applicant_dir = os.path.join(settings.UPLOAD_DIR, str(applicant_id))
            os.makedirs(applicant_dir, exist_ok=True)
            
            file_path = os.path.join(applicant_dir, filename)
            
            async with aiofiles.open(file_path, "wb") as f:
                await f.write(file_content)
            
            logger.info(f"✅ Datei lokal gespeichert: {file_path}")
            return True, file_path, ""
            
        except Exception as e:
            error_msg = f"Lokaler Upload-Fehler: {e}"
            logger.error(error_msg)
            return False, "", error_msg
    
    async def download_file(self, file_path_or_key: str) -> Tuple[bool, Optional[bytes], str]:
        """
        Lädt eine Datei herunter.
        
        Returns:
            Tuple[success, file_content, error_message]
        """
        if self.use_r2:
            return await self._download_from_r2(file_path_or_key)
        else:
            return await self._download_from_local(file_path_or_key)
    
    async def _download_from_r2(self, key: str) -> Tuple[bool, Optional[bytes], str]:
        """Download von Cloudflare R2"""
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=key
            )
            content = response['Body'].read()
            return True, content, ""
            
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                return False, None, "Datei nicht gefunden"
            error_msg = f"R2 Download-Fehler: {e}"
            logger.error(error_msg)
            return False, None, error_msg
        except Exception as e:
            error_msg = f"Unerwarteter Download-Fehler: {e}"
            logger.error(error_msg)
            return False, None, error_msg
    
    async def _download_from_local(self, file_path: str) -> Tuple[bool, Optional[bytes], str]:
        """Download von lokalem Filesystem"""
        try:
            import aiofiles
            
            if not os.path.exists(file_path):
                return False, None, "Datei nicht gefunden"
            
            async with aiofiles.open(file_path, "rb") as f:
                content = await f.read()
            
            return True, content, ""
            
        except Exception as e:
            error_msg = f"Lokaler Download-Fehler: {e}"
            logger.error(error_msg)
            return False, None, error_msg
    
    async def delete_file(self, file_path_or_key: str) -> Tuple[bool, str]:
        """
        Löscht eine Datei.
        
        Returns:
            Tuple[success, error_message]
        """
        if self.use_r2:
            return await self._delete_from_r2(file_path_or_key)
        else:
            return await self._delete_from_local(file_path_or_key)
    
    async def _delete_from_r2(self, key: str) -> Tuple[bool, str]:
        """Löschen von Cloudflare R2"""
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=key
            )
            logger.info(f"✅ Datei aus R2 gelöscht: {key}")
            return True, ""
            
        except Exception as e:
            error_msg = f"R2 Lösch-Fehler: {e}"
            logger.error(error_msg)
            return False, error_msg
    
    async def _delete_from_local(self, file_path: str) -> Tuple[bool, str]:
        """Löschen von lokalem Filesystem"""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            logger.info(f"✅ Datei lokal gelöscht: {file_path}")
            return True, ""
            
        except Exception as e:
            error_msg = f"Lokaler Lösch-Fehler: {e}"
            logger.error(error_msg)
            return False, error_msg
    
    def file_exists(self, file_path_or_key: str) -> bool:
        """Prüft ob eine Datei existiert"""
        if self.use_r2:
            try:
                self.s3_client.head_object(
                    Bucket=self.bucket_name,
                    Key=file_path_or_key
                )
                return True
            except:
                return False
        else:
            return os.path.exists(file_path_or_key)
    
    async def upload_generic(
        self,
        file_content: bytes,
        storage_path: str,
        content_type: str = 'application/octet-stream'
    ) -> Tuple[bool, str, str]:
        """
        Generischer Upload mit beliebigem Pfad (für Logos etc.)
        
        Args:
            file_content: Dateiinhalt
            storage_path: Pfad im Storage (z.B. "company-logos/123/logo.png")
            content_type: MIME-Type
            
        Returns:
            Tuple[success, file_path_or_key, error_message]
        """
        if self.use_r2:
            try:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=storage_path,
                    Body=file_content,
                    ContentType=content_type
                )
                logger.info(f"✅ Datei zu R2 hochgeladen: {storage_path}")
                return True, storage_path, ""
            except Exception as e:
                error_msg = f"R2 Upload-Fehler: {e}"
                logger.error(error_msg)
                return False, "", error_msg
        else:
            try:
                import aiofiles
                from app.core.config import settings
                
                # Vollständigen lokalen Pfad erstellen
                full_path = os.path.join(settings.UPLOAD_DIR, storage_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                async with aiofiles.open(full_path, "wb") as f:
                    await f.write(file_content)
                
                logger.info(f"✅ Datei lokal gespeichert: {full_path}")
                return True, storage_path, ""
            except Exception as e:
                error_msg = f"Lokaler Upload-Fehler: {e}"
                logger.error(error_msg)
                return False, "", error_msg
    
    def get_public_url(self, storage_path: str) -> str:
        """
        Generiert eine öffentliche URL für eine Datei.
        
        Für R2: Verwendet die Public Bucket URL
        Für lokal: Verwendet den API-Endpunkt
        """
        from app.core.config import settings
        
        if self.use_r2:
            # R2 Public URL (muss im Cloudflare Dashboard aktiviert sein)
            r2_public_url = getattr(settings, 'R2_PUBLIC_URL', None)
            if r2_public_url:
                return f"{r2_public_url}/{storage_path}"
            else:
                # Fallback: API-Endpunkt für Datei-Download
                return f"/api/v1/files/{storage_path}"
        else:
            # Lokaler Storage: API-Endpunkt
            return f"/api/v1/files/{storage_path}"


# Singleton-Instanz
storage_service = StorageService()

