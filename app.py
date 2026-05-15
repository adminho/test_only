import os
from flask import Flask, request, jsonify

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")

app = Flask(__name__)


def _safe_dest(filename: str) -> str | None:
    """Return a safe absolute destination path, or None if path traversal detected."""
    upload_root = os.path.normpath(UPLOAD_DIR)
    dest = os.path.normpath(os.path.join(upload_root, os.path.basename(filename) or "upload"))
    if not dest.startswith(upload_root + os.sep) and dest != upload_root:
        return None
    return dest


def _stream_to_disk(stream, dest: str):
    """Write *stream* to *dest* enforcing MAX_UPLOAD_BYTES. Returns (bytes_written, error_response)."""
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    bytes_written = 0
    chunk_size = 64 * 1024  # 64 KB
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = stream.read(chunk_size)
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > MAX_UPLOAD_BYTES:
                    out.close()
                    os.remove(dest)
                    return None, (jsonify(error="File exceeds the 10 MB size limit"), 413)
                out.write(chunk)
    except Exception:
        if os.path.exists(dest):
            os.remove(dest)
        raise
    return bytes_written, None


@app.route("/upload", methods=["POST"])
def upload():
    content_type = request.content_type or ""

    if content_type.startswith("multipart/"):
        # Content-Length is total request size (includes boundary overhead), not file size.
        # Use streaming check as the authoritative size enforcement.
        file = request.files.get("file")
        if file is None:
            return jsonify(error="No file provided"), 400

        dest = _safe_dest(file.filename or "upload")
        if dest is None:
            return jsonify(error="Invalid filename"), 400

        size, err = _stream_to_disk(file.stream, dest)
        if err:
            return err
    else:
        # Raw body upload: Content-Length == file size, so early rejection is reliable.
        content_length = request.content_length
        if content_length is not None and content_length > MAX_UPLOAD_BYTES:
            return jsonify(error="File exceeds the 10 MB size limit"), 413

        filename = request.args.get("filename", "upload")
        dest = _safe_dest(filename)
        if dest is None:
            return jsonify(error="Invalid filename"), 400

        size, err = _stream_to_disk(request.stream, dest)
        if err:
            return err

    return jsonify(message="Upload successful", size=size), 200


if __name__ == "__main__":
    app.run(debug=False)
