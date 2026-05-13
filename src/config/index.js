require('dotenv').config();
const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'uploads.json'),
  maxFileSizeBytes: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
};
