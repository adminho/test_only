'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { sanitizeFilename } = require('../utils/sanitizeFilename');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure the upload directory exists at startup.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    // Sanitize the original name supplied by the client.
    const safe = sanitizeFilename(file.originalname);

    // Prepend a random prefix so two uploads of the same name never collide.
    const unique = `${crypto.randomBytes(8).toString('hex')}-${safe}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

const router = express.Router();

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  return res.status(200).json({
    originalName: req.file.originalname,
    savedAs: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

module.exports = router;
