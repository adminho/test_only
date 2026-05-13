const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_BYTES || '10485760', 10); // 10 MB

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.pdf`),
});

function pdfFilter(_req, file, cb) {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    path.extname(file.originalname).toLowerCase() === '.pdf';

  if (!isPdf) {
    const err = new Error('Only PDF files are allowed');
    err.status = 400;
    return cb(err, false);
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Converts multer errors into shaped API errors
function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: `File exceeds maximum size of ${MAX_FILE_SIZE} bytes` });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  next(err);
}

module.exports = { upload, handleMulterError, UPLOAD_DIR };
