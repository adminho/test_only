const multer = require('multer');
const config = require('../config');

// Store files in memory so we can inspect magic bytes before writing to disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSizeBytes },
  fileFilter(_req, file, cb) {
    // Accept only application/pdf declared by the client.
    // Magic-byte check happens in the route after the buffer is available.
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      const err = new Error('Only PDF files are allowed');
      err.code = 'INVALID_FILE_TYPE';
      cb(err, false);
    }
  },
});

module.exports = upload;
