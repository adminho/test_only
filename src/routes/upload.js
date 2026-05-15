const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { upload, sanitizeFilename, UPLOADS_DIR } = require('../middleware/uploadMiddleware');
const { saveFileMetadata, getFileMetadata } = require('../services/metadataStore');

const router = express.Router();

// Verify the first 4 bytes are the PDF magic signature %PDF
function hasPdfMagicBytes(filePath) {
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, buf, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }
  return buf.toString('ascii') === '%PDF';
}

router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds the 10 MB limit' });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: 'Invalid file type. Only PDF files are accepted' });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Upload a PDF using the "file" field' });
    }

    // Secondary check: magic bytes guard against spoofed MIME types
    if (!hasPdfMagicBytes(req.file.path)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid file type. Only PDF files are accepted' });
    }

    const fileId = uuidv4();
    const sanitizedName = sanitizeFilename(req.file.originalname);
    const uploadedBy =
      (req.body && req.body.uploaded_by) ||
      req.headers['x-uploaded-by'] ||
      'anonymous';

    const metadata = {
      id: fileId,
      original_filename: req.file.originalname,
      sanitized_filename: sanitizedName,
      stored_filename: req.file.filename,
      file_size: req.file.size,
      uploaded_by: uploadedBy,
      uploaded_at: new Date().toISOString(),
    };

    try {
      saveFileMetadata(metadata);
    } catch (_storageErr) {
      fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: 'Failed to persist file metadata' });
    }

    const downloadUrl = `${req.protocol}://${req.get('host')}/api/files/${fileId}/download`;

    return res.status(201).json({
      message: 'File uploaded successfully',
      file_id: fileId,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      uploaded_at: metadata.uploaded_at,
      download_url: downloadUrl,
    });
  });
});

router.get('/files/:id/download', (req, res) => {
  const metadata = getFileMetadata(req.params.id);
  if (!metadata) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOADS_DIR, metadata.stored_filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.download(filePath, metadata.sanitized_filename);
});

module.exports = router;
