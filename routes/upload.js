'use strict';

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const upload = require('../middleware/upload');
const { insertRecord } = require('../db/database');
const { sanitizeFilename } = require('../utils/sanitize');

const router = express.Router();

const PDF_MAGIC = Buffer.from('%PDF-');

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Validate PDF magic bytes
  const header = req.file.buffer
    ? req.file.buffer.slice(0, 5)
    : (() => {
        try {
          const fs = require('fs');
          const fd = fs.openSync(req.file.path, 'r');
          const buf = Buffer.alloc(5);
          fs.readSync(fd, buf, 0, 5, 0);
          fs.closeSync(fd);
          return buf;
        } catch {
          return Buffer.alloc(0);
        }
      })();

  if (!header.equals(PDF_MAGIC)) {
    return res.status(400).json({ error: 'Invalid PDF content' });
  }

  // Sanitize the original filename before persisting to metadata
  const sanitizedFilename = sanitizeFilename(req.file.originalname);

  const downloadToken = uuidv4();
  const record = {
    original_filename: sanitizedFilename,   // sanitized — never raw user input
    stored_filename: req.file.filename,
    file_size: req.file.size,
    uploaded_at: new Date().toISOString(),
    download_token: downloadToken,
  };

  insertRecord(record);

  return res.status(201).json({
    message: 'File uploaded successfully',
    download_url: `/download/${downloadToken}`,
    filename: sanitizedFilename,
    file_size: req.file.size,
  });
});

// Multer error handler
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: err.message || 'Invalid file type' });
  }
  return res.status(400).json({ error: err.message || 'Upload error' });
});

module.exports = router;
