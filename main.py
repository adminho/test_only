from fastapi import FastAPI, File, UploadFile, HTTPException
import os

app = FastAPI()

ALLOWED_EXTENSION = ".pdf"
ALLOWED_MIME_TYPE = "application/pdf"


def validate_pdf(file: UploadFile) -> None:
    _, ext = os.path.splitext(file.filename or "")
    if ext.lower() != ALLOWED_EXTENSION:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: only PDF files are accepted (got '{ext or 'no extension'}').",
        )
    if file.content_type != ALLOWED_MIME_TYPE:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MIME type: expected application/pdf, got '{file.content_type}'.",
        )


@app.post("/upload", status_code=200)
async def upload_file(file: UploadFile = File(...)):
    validate_pdf(file)
    contents = await file.read()
    return {"filename": file.filename, "size": len(contents)}
