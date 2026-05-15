import io
import os
import pytest
from app import app, MAX_UPLOAD_BYTES

LIMIT = MAX_UPLOAD_BYTES  # 10 MB


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("UPLOAD_DIR", str(tmp_path))
    import app as app_module
    app_module.UPLOAD_DIR = str(tmp_path)
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def _upload_multipart(client, data: bytes, filename="test.bin"):
    return client.post(
        "/upload",
        data={"file": (io.BytesIO(data), filename)},
        content_type="multipart/form-data",
    )


def _upload_raw(client, data: bytes, filename="test.bin", content_length=None):
    kwargs = {
        "data": data,
        "content_type": "application/octet-stream",
        "query_string": {"filename": filename},
    }
    if content_length is not None:
        # Override WSGI CONTENT_LENGTH so request.content_length reflects it.
        kwargs["environ_overrides"] = {"CONTENT_LENGTH": str(content_length)}
    return client.post("/upload", **kwargs)


# TC-003: multipart file at exactly the limit is accepted
def test_tc003_exact_limit_accepted(client):
    data = b"x" * LIMIT
    resp = _upload_multipart(client, data)
    assert resp.status_code == 200
    assert resp.get_json()["size"] == LIMIT


# TC-003: multipart file one byte over the limit is rejected with 413
def test_tc003_one_byte_over_rejected(client):
    data = b"x" * (LIMIT + 1)
    resp = _upload_multipart(client, data)
    assert resp.status_code == 413
    assert "10 MB" in resp.get_json()["error"]


# Raw upload: early rejection when Content-Length header signals oversized payload
def test_content_length_early_rejection(client):
    # Send 100 bytes but claim LIMIT+1 in Content-Length → rejected before body is read.
    resp = _upload_raw(client, b"x" * 100, content_length=LIMIT + 1)
    assert resp.status_code == 413
    assert "10 MB" in resp.get_json()["error"]


# Raw upload: streaming check catches oversized body when Content-Length is absent/exact
def test_raw_streaming_size_check(client):
    resp = _upload_raw(client, b"x" * (LIMIT + 1))
    assert resp.status_code == 413


# Small multipart file well within limit is accepted
def test_small_file_accepted(client):
    data = b"hello world"
    resp = _upload_multipart(client, data, filename="hello.txt")
    assert resp.status_code == 200
    assert resp.get_json()["size"] == len(data)


# Missing file field returns 400
def test_missing_file_returns_400(client):
    resp = client.post("/upload", data={}, content_type="multipart/form-data")
    assert resp.status_code == 400


# Oversized multipart file is not persisted to disk after streaming check
def test_oversized_file_not_persisted(client, tmp_path):
    data = b"x" * (LIMIT + 1)
    _upload_multipart(client, data, filename="big.bin")
    assert not (tmp_path / "big.bin").exists()
