import io
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Minimal valid PDF bytes (header + EOF marker)
VALID_PDF_BYTES = b"%PDF-1.4\n%%EOF"


def test_upload_valid_pdf():
    """Happy path: a real PDF file is accepted."""
    response = client.post(
        "/upload",
        files={"file": ("document.pdf", io.BytesIO(VALID_PDF_BYTES), "application/pdf")},
    )
    assert response.status_code == 200
    assert response.json()["filename"] == "document.pdf"


# TC-002: Wrong extension (e.g. image.jpg) → HTTP 400
def test_upload_wrong_extension_tc002():
    """TC-002: File with a non-PDF extension is rejected with HTTP 400."""
    response = client.post(
        "/upload",
        files={"file": ("image.jpg", io.BytesIO(b"fake image data"), "image/jpeg")},
    )
    assert response.status_code == 400
    body = response.json()
    assert "detail" in body
    assert ".jpg" in body["detail"] or "PDF" in body["detail"]


# TC-003: Correct extension but wrong MIME type → HTTP 400
def test_upload_wrong_mime_type_tc003():
    """TC-003: File with .pdf extension but wrong MIME type is rejected with HTTP 400."""
    response = client.post(
        "/upload",
        files={"file": ("sneaky.pdf", io.BytesIO(b"not a real pdf"), "image/png")},
    )
    assert response.status_code == 400
    body = response.json()
    assert "detail" in body
    assert "image/png" in body["detail"] or "MIME" in body["detail"]


def test_upload_no_extension():
    """File with no extension is rejected with HTTP 400."""
    response = client.post(
        "/upload",
        files={"file": ("filewithnoext", io.BytesIO(b"data"), "application/pdf")},
    )
    assert response.status_code == 400
    assert "no extension" in response.json()["detail"]


def test_upload_pdf_mime_but_non_pdf_ext():
    """File with PDF MIME type but wrong extension is rejected by extension check first."""
    response = client.post(
        "/upload",
        files={"file": ("report.docx", io.BytesIO(b"data"), "application/pdf")},
    )
    assert response.status_code == 400
    assert ".docx" in response.json()["detail"] or "PDF" in response.json()["detail"]
