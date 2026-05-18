'use strict';

const express = require('express');
const path = require('path');
const fs = require('fs');
const { findByToken } = require('../db/database');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'private_uploads');

router.get('/:token', (req, res) => {
  const record = findByToken(req.params.token);
  if (!record) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOAD_DIR, record.stored_filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  // original_filename is already sanitized at upload time — safe for Content-Disposition
  res.setHeader('Content-Disposition', `attachment; filename="${record.original_filename}"`);
  return res.sendFile(filePath);
});

module.exports = router;
