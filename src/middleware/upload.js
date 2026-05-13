const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Ensure upload directory exists before multer needs it
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, config.uploadDir);
  },
  filename(_req, _file, cb) {
    // Use UUID so the stored name is unguessable and has no path-traversal risk
    cb(null, `${uuidv4()}.pdf`);
  },
});

function fileFilter(_req, file, cb) {
  const allowedMime = 'application/pdf';
  const allowedExt = '.pdf';
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.mimetype !== allowedMime || ext !== allowedExt) {
    return cb(Object.assign(new Error('Only PDF files are accepted'), { code: 'INVALID_FILE_TYPE' }));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxFileSizeBytes },
});

module.exports = upload;
