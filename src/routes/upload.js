const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const storage = require('../storage');

const router = express.Router();

// Store files in memory so we can validate before writing to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
    }
  },
});

/**
 * POST /upload
 * Accepts a single PDF file via multipart/form-data field "file".
 * Returns 200 { url } on success, 400 on invalid input, 500 on storage failure.
 */
router.post('/', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      // Multer rejected the file (wrong type or missing field)
      return res.status(400).json({ error: 'Only PDF files are accepted.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a PDF in the "file" field.' });
    }

    const filename = `${uuidv4()}.pdf`;

    try {
      await storage.storeFile(filename, req.file.buffer);
      const url = storage.buildDownloadUrl(req, filename);
      return res.status(200).json({ url });
    } catch (storageErr) {
      return res.status(500).json({ error: 'Failed to store the uploaded file.' });
    }
  });
});

module.exports = router;
