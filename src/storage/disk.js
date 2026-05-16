const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function ensureUploadDir() {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
}

/**
 * Persist an uploaded file buffer to disk under a UUID-based filename.
 * Returns { id, filename, storedPath }.
 */
function saveFile(originalName, buffer) {
  ensureUploadDir();

  const id = uuidv4();
  const ext = path.extname(originalName) || '.pdf';
  const filename = `${id}${ext}`;
  const storedPath = path.join(config.uploadDir, filename);

  fs.writeFileSync(storedPath, buffer);

  return { id, filename, storedPath };
}

/**
 * Return the absolute path for a stored file by its filename.
 * Returns null if the file does not exist.
 */
function getFilePath(filename) {
  const filePath = path.join(config.uploadDir, filename);
  return fs.existsSync(filePath) ? filePath : null;
}

module.exports = { saveFile, getFilePath };
