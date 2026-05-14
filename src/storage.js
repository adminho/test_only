const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function saveFile(filename, buffer) {
  ensureUploadDir();
  const dest = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(dest, buffer);
}

function getUploadDir() {
  return UPLOAD_DIR;
}

module.exports = { saveFile, getUploadDir };
