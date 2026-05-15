const express = require('express');
const fs = require('fs');
const path = require('path');
const { upload, UPLOAD_DIR } = require('../middleware/upload');

const router = express.Router();

// Ensure storage directory exists on startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * POST /api/upload
 * Accepts: multipart/form-data with field "file" (PDF, max 10 MB)
 * Returns: { url: "/api/files/<uuid>.pdf", filename: "<uuid>.pdf" }
 */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return next(err);

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send a PDF in the "file" field.' });
    }

    // Validate MIME type after the stream is fully drained to avoid mid-upload abort.
    if (req.file.mimetype !== 'application/pdf') {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'Only PDF files are accepted.' });
    }

    const { filename } = req.file;
    const downloadUrl = `/api/files/${filename}`;

    return res.status(201).json({ url: downloadUrl, filename });
  });
});

/**
 * GET /api/files/:filename
 * Serves the stored PDF; protects against path traversal.
 */
router.get('/files/:filename', (req, res) => {
  const safeName = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  return res.sendFile(filePath);
});

module.exports = router;
