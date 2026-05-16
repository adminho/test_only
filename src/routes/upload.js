const express = require('express');
const upload = require('../middleware/multerConfig');
const disk = require('../storage/disk');
const metadata = require('../metadata/store');
const config = require('../config');

const router = express.Router();

// PDF magic bytes: "%PDF-"
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

function hasPdfMagicBytes(buffer) {
  if (buffer.length < PDF_MAGIC.length) return false;
  return PDF_MAGIC.every((byte, i) => buffer[i] === byte);
}

/**
 * POST /upload
 * Accepts multipart/form-data with a single "file" field containing a PDF.
 *
 * Success 200: { id, originalName, size, uploadedAt, downloadUrl }
 * Error  400: missing file or invalid file type
 * Error  413: file exceeds size limit
 * Error  500: storage failure
 */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large', maxBytes: config.maxFileSizeBytes });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: err.message });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a PDF in the "file" field.' });
    }

    // Secondary validation: verify PDF magic bytes regardless of declared MIME type.
    if (!hasPdfMagicBytes(req.file.buffer)) {
      return res.status(400).json({ error: 'File content is not a valid PDF' });
    }

    let stored;
    try {
      stored = disk.saveFile(req.file.originalname, req.file.buffer);
    } catch (storageErr) {
      console.error('Storage failure:', storageErr);
      return res.status(500).json({ error: 'Failed to store the uploaded file' });
    }

    const record = {
      id: stored.id,
      originalName: req.file.originalname,
      filename: stored.filename,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    };

    try {
      metadata.create(record);
    } catch (metaErr) {
      console.error('Metadata persistence failure:', metaErr);
      return res.status(500).json({ error: 'Failed to persist file metadata' });
    }

    const downloadUrl = `${config.baseUrl}/files/${record.id}`;

    return res.status(200).json({
      id: record.id,
      originalName: record.originalName,
      size: record.size,
      uploadedAt: record.uploadedAt,
      downloadUrl,
    });
  });
});

/**
 * GET /files/:id
 * Stream the stored PDF back to the client.
 */
router.get('/files/:id', (req, res) => {
  const record = metadata.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = disk.getFilePath(record.filename);
  if (!filePath) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
  return res.sendFile(filePath);
});

module.exports = router;
