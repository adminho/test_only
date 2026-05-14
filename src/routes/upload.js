const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { multerPdfFilter, validatePdfMagic } = require('../middleware/validatePdf');
const { saveFile } = require('../services/storage');
const { insertFile } = require('../services/metadata');

const router = express.Router();

const upload = multer({
  dest: config.upload.tempDir,
  limits: { fileSize: config.upload.maxFileSizeBytes },
  fileFilter: multerPdfFilter,
});

/**
 * POST /api/upload
 * Accepts: multipart/form-data with a "file" field containing a PDF.
 * Returns: 200 { id, download_url, original_name, size_bytes }
 */
router.post('/', upload.single('file'), validatePdfMagic, (req, res, next) => {
  try {
    const id = uuidv4();
    const ext = path.extname(req.file.originalname).toLowerCase() || '.pdf';
    const storedName = `${id}${ext}`;
    const downloadUrl = `${config.baseUrl}/api/files/${id}/download`;

    saveFile(req.file.path, storedName);

    insertFile({
      id,
      original_name: req.file.originalname,
      stored_name: storedName,
      mime_type: req.file.mimetype,
      size_bytes: req.file.size,
      download_url: downloadUrl,
    });

    return res.status(200).json({
      id,
      download_url: downloadUrl,
      original_name: req.file.originalname,
      size_bytes: req.file.size,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
