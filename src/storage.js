const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Persists an uploaded file buffer to the uploads directory.
 * @param {string} filename - The unique filename to store the file under.
 * @param {Buffer} buffer - The file contents.
 * @returns {Promise<string>} Resolves with the stored filename.
 */
function storeFile(filename, buffer) {
  return new Promise((resolve, reject) => {
    const dest = path.join(UPLOADS_DIR, filename);
    fs.writeFile(dest, buffer, (err) => {
      if (err) return reject(err);
      resolve(filename);
    });
  });
}

/**
 * Builds the public download URL for a stored file.
 * @param {Object} req - Express request object (used to derive host/protocol).
 * @param {string} filename - The stored filename.
 * @returns {string}
 */
function buildDownloadUrl(req, filename) {
  const host = req.get('host');
  const protocol = req.protocol;
  return `${protocol}://${host}/downloads/${encodeURIComponent(filename)}`;
}

module.exports = { storeFile, buildDownloadUrl, UPLOADS_DIR };
