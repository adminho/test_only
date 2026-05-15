const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { upload, UPLOAD_DIR } = require('../middleware/fileUpload');

const router = express.Router();

const PDF_MAGIC = Buffer.from('%PDF-');
const FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

function verifyPdfMagic(filePath) {
  const buf = Buffer.alloc(5);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 5, 0);
  fs.closeSync(fd);
  return buf.equals(PDF_MAGIC);
}

router.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File size exceeds the 10MB limit' });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: 'Invalid file type. Only PDF files are allowed' });
      }
      return res.status(500).json({ error: 'Storage failure' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    try {
      if (!verifyPdfMagic(req.file.path)) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Invalid file type. Only PDF files are allowed' });
      }
    } catch {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      return res.status(500).json({ error: 'Storage failure' });
    }

    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/api/download/${req.file.filename}`;

    return res.status(200).json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      downloadUrl,
    });
  });
});

router.get('/download/:filename', (req, res) => {
  const { filename } = req.params;

  if (!FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.sendFile(filePath);
});

module.exports = router;
