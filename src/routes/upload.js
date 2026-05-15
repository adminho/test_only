const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { db } = require('../db');

const router = express.Router();

const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const fileId = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  },
});

const upload = multer({ storage });

// POST /upload — accepts a single file field named "file"
// Requires X-User-Id header (or query param user_id) to identify the uploader
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const uploadedBy = req.headers['x-user-id'] || req.query.user_id;
  if (!uploadedBy) {
    return res.status(400).json({ error: 'Missing uploader identifier (X-User-Id header or user_id query param)' });
  }

  const fileId = path.basename(req.file.filename, path.extname(req.file.filename));
  const uploadedAt = new Date().toISOString();

  const record = {
    file_id: fileId,
    original_filename: req.file.originalname,
    file_size: req.file.size,
    uploaded_by: uploadedBy,
    uploaded_at: uploadedAt,
  };

  db.insertUpload(record);

  return res.status(201).json(record);
});

// GET /upload/:fileId — retrieve metadata for a stored file
router.get('/:fileId', (req, res) => {
  const record = db.findUpload(req.params.fileId);

  if (!record) {
    return res.status(404).json({ error: 'File not found' });
  }

  return res.json(record);
});

module.exports = router;
