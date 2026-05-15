const express = require('express');
const path = require('path');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File exceeds the 10 MB size limit' });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: err.message });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filename = req.file.filename;
    const downloadUrl = `${req.protocol}://${req.get('host')}/files/${filename}`;

    return res.status(200).json({ downloadUrl });
  });
});

module.exports = router;
