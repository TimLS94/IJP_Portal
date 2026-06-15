"""
Wandelt .docx-Bytes per LibreOffice (headless) in PDF-Bytes um.

LibreOffice wird im Docker-Image installiert (siehe backend/Dockerfile) und ist
lokal über `soffice` verfügbar. Für Parallel-Sicherheit erhält jeder Aufruf ein
eigenes UserInstallation-Profil.
"""
import os
import shutil
import subprocess
import tempfile
import uuid
import logging

logger = logging.getLogger(__name__)


def _find_soffice() -> str | None:
    candidates = [
        "soffice",
        "libreoffice",
        "/usr/bin/soffice",
        "/usr/bin/libreoffice",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",  # macOS (lokal)
    ]
    for c in candidates:
        path = shutil.which(c) if not os.path.isabs(c) else (c if os.path.exists(c) else None)
        if path:
            return path
    return None


def docx_to_pdf_bytes(docx_bytes: bytes) -> bytes:
    """Konvertiert .docx-Bytes zu PDF-Bytes. Wirft RuntimeError bei Fehler."""
    soffice = _find_soffice()
    if not soffice:
        raise RuntimeError(
            "LibreOffice (soffice) ist nicht installiert – docx→PDF nicht möglich."
        )

    work_dir = tempfile.mkdtemp(prefix="contract_")
    profile_dir = os.path.join(work_dir, f"lo_profile_{uuid.uuid4().hex}")
    in_path = os.path.join(work_dir, "contract.docx")
    out_path = os.path.join(work_dir, "contract.pdf")
    try:
        with open(in_path, "wb") as f:
            f.write(docx_bytes)

        result = subprocess.run(
            [
                soffice,
                f"-env:UserInstallation=file://{profile_dir}",
                "--headless",
                "--convert-to",
                "pdf",
                "--outdir",
                work_dir,
                in_path,
            ],
            capture_output=True,
            timeout=120,
        )
        if not os.path.exists(out_path):
            logger.error(
                "docx→PDF fehlgeschlagen: rc=%s stdout=%s stderr=%s",
                result.returncode,
                result.stdout.decode(errors="ignore")[:500],
                result.stderr.decode(errors="ignore")[:500],
            )
            raise RuntimeError("PDF-Konvertierung fehlgeschlagen")
        with open(out_path, "rb") as f:
            return f.read()
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
