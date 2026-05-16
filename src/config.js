const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_BYTES || '10485760', 10), // 10 MB
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'),
  metadataFile: process.env.METADATA_FILE || path.join(__dirname, '..', 'metadata.json'),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
};
