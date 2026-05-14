const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * Ensures the storage directory exists and moves the uploaded temp file into it.
 * Returns the final absolute path of the stored file.
 */
function saveFile(tempPath, storedName) {
  fs.mkdirSync(config.storageDir, { recursive: true });

  const dest = path.join(config.storageDir, storedName);
  fs.renameSync(tempPath, dest);
  return dest;
}

/**
 * Returns the absolute path for a stored file by name, or null if it doesn't exist.
 */
function getFilePath(storedName) {
  const filePath = path.join(config.storageDir, storedName);
  return fs.existsSync(filePath) ? filePath : null;
}

module.exports = { saveFile, getFilePath };
