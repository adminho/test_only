'use strict';

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', 'private_uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Store with a UUID name so the filesystem is never touched by user-supplied names
  filename: (_req, _file, cb) => cb(null, `${uuidv4()}.pdf`),
});

function fileFilter(_req, file, cb) {
  const allowedMime = 'application/pdf';
  const allowedExt = '.pdf';
  if (
    file.mimetype === allowedMime &&
    path.extname(file.originalname).toLowerCase() === allowedExt
  ) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only PDF files are allowed'));
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

module.exports = upload;
