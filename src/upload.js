const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sanitizeFilename } = require('./sanitizeFilename');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    const safe = sanitizeFilename(file.originalname);
    cb(null, safe);
  },
});

const upload = multer({ storage });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  res.json({
    originalName: req.file.originalname,
    savedAs: req.file.filename,
    size: req.file.size,
  });
});

module.exports = router;
