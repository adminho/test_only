import io
import pytest
from app import app

PDF_MAGIC = b"%PDF-1.4 fake pdf content"
JPG_MAGIC = b"\xff\xd8\xff\xe0 fake jpg content"


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _upload(client, data, filename, content_type):
    return client.post(
        "/upload",
        data={"file": (io.BytesIO(data), filename, content_type)},
        content_type="multipart/form-data",
    )


# TC-001: valid PDF → HTTP 200
def test_valid_pdf_returns_200(client):
    response = _upload(client, PDF_MAGIC, "document.pdf", "application/pdf")
    assert response.status_code == 200
    assert response.get_json()["message"] == "File uploaded successfully"


# TC-002: JPG file → HTTP 400
def test_jpg_returns_400(client):
    response = _upload(client, JPG_MAGIC, "image.jpg", "image/jpeg")
    assert response.status_code == 400
    assert "error" in response.get_json()


def test_wrong_extension_returns_400(client):
    response = _upload(client, PDF_MAGIC, "document.txt", "application/pdf")
    assert response.status_code == 400


def test_wrong_mime_type_returns_400(client):
    response = _upload(client, PDF_MAGIC, "document.pdf", "application/octet-stream")
    assert response.status_code == 400


def test_pdf_extension_but_jpg_content_returns_400(client):
    response = _upload(client, JPG_MAGIC, "fake.pdf", "application/pdf")
    assert response.status_code == 400


def test_no_file_returns_400(client):
    response = client.post("/upload", content_type="multipart/form-data")
    assert response.status_code == 400
