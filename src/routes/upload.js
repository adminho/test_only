const express = require('express');
const multer = require('multer');

const router = express.Router();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large. Maximum allowed size is 10 MB.',
        });
      }
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully.',
      filename: req.file.originalname,
      size: req.file.size,
    });
  });
});

module.exports = router;
