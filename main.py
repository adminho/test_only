import uuid
import os
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

app = FastAPI(title="PDF Upload API")


@app.post("/upload", status_code=201)
async def upload_pdf(request: Request, file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()

    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds the 10 MB limit.")

    filename = f"{uuid.uuid4()}.pdf"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(contents)

    base_url = str(request.base_url).rstrip("/")
    download_url = f"{base_url}/files/{filename}"

    return {"download_url": download_url}


@app.get("/files/{filename}")
async def download_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(path=str(file_path), media_type="application/pdf", filename=filename)
