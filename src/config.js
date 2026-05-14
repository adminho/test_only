const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Storage outside the public web root
  storageDir: process.env.STORAGE_DIR || path.resolve(__dirname, '..', 'storage'),

  // JSON metadata store
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '..', 'data', 'metadata.json'),

  upload: {
    maxFileSizeBytes: 20 * 1024 * 1024, // 20 MB
    allowedMimeType: 'application/pdf',
    // multer stores to a temp location; we move it ourselves
    tempDir: process.env.TEMP_DIR || path.resolve(__dirname, '..', 'storage', 'tmp'),
  },
};
