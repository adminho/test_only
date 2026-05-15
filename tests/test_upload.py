import io
import pytest
from fastapi.testclient import TestClient

from main import app, UPLOAD_DIR

client = TestClient(app)

MINIMAL_PDF = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n"
    b"xref\n0 4\n0000000000 65535 f \n"
    b"trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n0\n%%EOF\n"
)


def test_upload_valid_pdf():
    response = client.post(
        "/upload",
        files={"file": ("document.pdf", io.BytesIO(MINIMAL_PDF), "application/pdf")},
    )
    assert response.status_code == 201
    body = response.json()
    assert "download_url" in body
    assert body["download_url"].endswith(".pdf")


def test_upload_missing_file():
    response = client.post("/upload")
    assert response.status_code == 422


def test_upload_wrong_content_type():
    response = client.post(
        "/upload",
        files={"file": ("data.csv", io.BytesIO(b"a,b,c"), "text/csv")},
    )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_upload_file_too_large():
    large_content = b"%PDF-1.4\n" + b"x" * (10 * 1024 * 1024 + 1)
    response = client.post(
        "/upload",
        files={"file": ("big.pdf", io.BytesIO(large_content), "application/pdf")},
    )
    assert response.status_code == 413
    assert "10 MB" in response.json()["detail"]


def test_upload_exactly_10mb():
    # Exactly 10 MB should be accepted
    exact_content = b"%PDF-1.4\n" + b"x" * (10 * 1024 * 1024 - 9)
    response = client.post(
        "/upload",
        files={"file": ("exact.pdf", io.BytesIO(exact_content), "application/pdf")},
    )
    assert response.status_code == 201


def test_download_uploaded_file():
    upload_resp = client.post(
        "/upload",
        files={"file": ("doc.pdf", io.BytesIO(MINIMAL_PDF), "application/pdf")},
    )
    assert upload_resp.status_code == 201
    download_url = upload_resp.json()["download_url"]
    # Extract path from the full URL
    path = "/" + "/".join(download_url.split("/")[3:])
    dl_resp = client.get(path)
    assert dl_resp.status_code == 200
    assert dl_resp.headers["content-type"] == "application/pdf"


def test_download_nonexistent_file():
    response = client.get("/files/nonexistent-file.pdf")
    assert response.status_code == 404
