from flask import Flask, request, jsonify

app = Flask(__name__)

ALLOWED_EXTENSION = "pdf"
ALLOWED_MIME_TYPE = "application/pdf"
PDF_MAGIC_BYTES = b"%PDF"


def _is_valid_pdf(file) -> tuple[bool, str]:
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext != ALLOWED_EXTENSION:
        return False, f"Invalid file extension: .{ext}"

    mime = file.mimetype or ""
    if mime != ALLOWED_MIME_TYPE:
        return False, f"Invalid MIME type: {mime}"

    header = file.stream.read(4)
    file.stream.seek(0)
    if header != PDF_MAGIC_BYTES:
        return False, "File content does not match PDF format"

    return True, ""


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    valid, reason = _is_valid_pdf(file)
    if not valid:
        return jsonify({"error": reason}), 400

    return jsonify({"message": "File uploaded successfully"}), 200


if __name__ == "__main__":
    app.run(debug=True)
