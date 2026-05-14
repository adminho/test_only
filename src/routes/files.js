const express = require('express');
const path = require('path');
const { findById } = require('../services/metadata');
const { getFilePath } = require('../services/storage');

const router = express.Router();

/**
 * GET /api/files/:id/download
 * Streams the stored PDF back to the client using the original filename.
 */
router.get('/:id/download', (req, res, next) => {
  try {
    const record = findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const filePath = getFilePath(record.stored_name);
    if (!filePath) {
      return res.status(404).json({ error: 'File data not found on disk.' });
    }

    const safeFilename = path.basename(record.original_name).replace(/[^\w.\-]/g, '_');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
