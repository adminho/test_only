const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { upload, handleMulterError, UPLOAD_DIR } = require('../middleware/upload');
const { insertUpload, getUploadById } = require('../db');

const router = express.Router();

// POST /api/uploads — receive, validate, store, persist metadata, return download URL
router.post(
  '/',
  (req, res, next) => upload.single('file')(req, res, (err) => handleMulterError(err, req, res, next)),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Send a PDF in the "file" field.' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const record = {
      id,
      originalName: req.file.originalname,
      storedName: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: now,
    };

    insertUpload(record);

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return res.status(201).json({
      id: record.id,
      originalName: record.originalName,
      size: record.size,
      uploadedAt: record.uploadedAt,
      downloadUrl: `${baseUrl}/api/uploads/${record.id}/download`,
    });
  }
);

// GET /api/uploads/:id/download — serve the stored PDF
router.get('/:id/download', (req, res) => {
  const record = getUploadById(req.params.id);
  if (!record) {
    return res.status(404).json({ error: 'Upload not found' });
  }

  const filePath = path.join(UPLOAD_DIR, record.storedName);
  if (!fs.existsSync(filePath)) {
    return res.status(410).json({ error: 'File no longer available' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${record.originalName}"`);
  res.sendFile(filePath);
});

module.exports = router;
