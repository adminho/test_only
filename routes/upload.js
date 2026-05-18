const express = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { upload } = require('../middleware/upload');

const router = express.Router();

router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    // File size exceeded
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
    }

    // Unexpected field name or other multer error
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload error.' });
    }

    // Wrong file type (rejected by fileFilter)
    if (req._fileTypeError) {
      return res.status(400).json({ error: 'Invalid file type. Only PDF files are accepted.' });
    }

    // Missing or empty file body
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided. Please attach a PDF file.' });
    }

    // Validate PDF magic bytes
    const buf = Buffer.alloc(5);
    let fd;
    try {
      fd = fs.openSync(req.file.path, 'r');
      fs.readSync(fd, buf, 0, 5, 0);
      fs.closeSync(fd);
    } catch (_) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Could not read uploaded file.' });
    }

    if (buf.toString() !== '%PDF-') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File content is not a valid PDF.' });
    }

    const downloadToken = uuidv4();
    const metadata = {
      original_filename: req.file.originalname,
      stored_filename: req.file.filename,
      file_size: req.file.size,
      uploaded_by: req.body.uploaded_by || req.headers['x-uploaded-by'] || 'anonymous',
      uploaded_at: new Date().toISOString(),
      download_token: downloadToken,
    };

    return res.status(201).json({
      message: 'File uploaded successfully',
      download_url: `${req.protocol}://${req.get('host')}/download/${downloadToken}`,
      metadata,
    });
  });
});

module.exports = router;
