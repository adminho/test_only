const express = require('express');
const { sanitizeFilename } = require('../utils/sanitizeFilename');

// In-memory metadata store — replace with a database in production.
const uploadedFiles = [];

function createUploadRouter(uploader) {
  const router = express.Router();

  router.post('/', (req, res, next) => {
    uploader.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large. Maximum allowed size is 5 MB.' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (req.fileTypeRejected) {
        return res.status(400).json({ error: 'Only PDF files are allowed. Received a non-PDF file.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided. Attach a file using the "file" field.' });
      }

      const sanitizedName = sanitizeFilename(req.file.originalname);
      const metadata = {
        originalName: req.file.originalname,
        savedAs: sanitizedName,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      };

      uploadedFiles.push(metadata);

      return res.status(200).json({
        message: 'File uploaded successfully',
        metadata,
        downloadUrl: `/uploads/${sanitizedName}`,
      });
    });
  });

  return router;
}

module.exports = { createUploadRouter, uploadedFiles };
