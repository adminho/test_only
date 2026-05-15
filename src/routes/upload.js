const express = require('express');
const path = require('path');
const multer = require('multer');
const { upload, UPLOAD_DIR } = require('../middleware/multerConfig');
const metadata = require('../storage/metadata');

const router = express.Router();

// UUID v4 format — prevents path traversal in the download endpoint
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const id = path.basename(req.file.filename, '.pdf');
    const record = {
      id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    try {
      metadata.saveFile(id, record);
    } catch {
      return res.status(500).json({ error: 'Failed to persist file metadata.' });
    }

    return res.status(201).json({
      id,
      filename: record.originalName,
      size: record.size,
      downloadUrl: `${req.protocol}://${req.get('host')}/api/files/${id}`,
    });
  });
});

router.get('/files/:id', (req, res) => {
  const { id } = req.params;

  if (!UUID_RE.test(id)) {
    return res.status(404).json({ error: 'File not found.' });
  }

  const record = metadata.getFile(id);
  if (!record) {
    return res.status(404).json({ error: 'File not found.' });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(path.resolve(UPLOAD_DIR, record.storedName));
});

module.exports = router;
