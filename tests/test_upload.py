"""Upload API test suite — covers all six cases from the Upload Test Matrix."""
import io
import pytest
from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as client:
        yield client


def _pdf_bytes(size_bytes: int = 1024) -> bytes:
    """Return a minimal PDF-like byte string of approximately *size_bytes*."""
    header = b"%PDF-1.4\n"
    return header + b"x" * max(0, size_bytes - len(header))


# ---------------------------------------------------------------------------
# TC-001: Valid PDF succeeds
# ---------------------------------------------------------------------------

def test_tc001_valid_pdf_succeeds(client):
    data = {"file": (io.BytesIO(_pdf_bytes()), "document.pdf")}
    response = client.post("/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# TC-002: JPG rejected with 400
# ---------------------------------------------------------------------------

def test_tc002_jpg_rejected_400(client):
    jpeg_header = b"\xff\xd8\xff\xe0" + b"\x00" * 100
    data = {"file": (io.BytesIO(jpeg_header), "photo.jpg")}
    response = client.post("/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 400
    payload = response.get_json()
    assert "error" in payload


# ---------------------------------------------------------------------------
# TC-003: Oversized PDF rejected with 413
# ---------------------------------------------------------------------------

def test_tc003_oversized_pdf_rejected_413(client):
    oversized = _pdf_bytes(11 * 1024 * 1024)  # 11 MB — exceeds the 10 MB limit
    data = {"file": (io.BytesIO(oversized), "large.pdf")}
    response = client.post("/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 413


# ---------------------------------------------------------------------------
# TC-004: Missing file rejected with 400
# ---------------------------------------------------------------------------

def test_tc004_missing_file_rejected_400(client):
    response = client.post("/upload", data={}, content_type="multipart/form-data")
    assert response.status_code == 400
    payload = response.get_json()
    assert "error" in payload


# ---------------------------------------------------------------------------
# TC-005: Unsafe (path-traversal) filename is sanitized
# ---------------------------------------------------------------------------

def test_tc005_unsafe_filename_sanitized(client):
    data = {"file": (io.BytesIO(_pdf_bytes()), "../../../etc/passwd.pdf")}
    response = client.post("/upload", data=data, content_type="multipart/form-data")
    # Upload should succeed — the server must sanitize, not reject
    assert response.status_code == 200
    payload = response.get_json()
    # The returned URL must not contain path-traversal sequences
    assert ".." not in payload["url"]


# ---------------------------------------------------------------------------
# TC-006: Successful upload returns a download URL
# ---------------------------------------------------------------------------

def test_tc006_successful_upload_returns_download_url(client):
    data = {"file": (io.BytesIO(_pdf_bytes()), "report.pdf")}
    response = client.post("/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 200
    payload = response.get_json()
    assert "url" in payload
    assert payload["url"].startswith("/download/")
