require('dotenv').config();
const path = require('path');

// UPLOAD_DIR must resolve to a location outside the web root (public/).
// Default: <project-root>/uploads — a sibling of public/, never inside it.
const uploadDir =
  process.env.UPLOAD_DIR ||
  path.resolve(__dirname, '..', 'uploads');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  uploadDir,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024,
};
