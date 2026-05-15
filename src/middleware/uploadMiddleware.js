const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Remove path components and characters that could allow path traversal or shell injection
function sanitizeFilename(filename) {
  const base = path.basename(filename);
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '_');
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.pdf`),
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype !== 'application/pdf') {
    const err = new Error('Only PDF files are allowed');
    err.code = 'INVALID_FILE_TYPE';
    return cb(err, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

module.exports = { upload, sanitizeFilename, UPLOADS_DIR };
