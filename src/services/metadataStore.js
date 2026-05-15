const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(METADATA_FILE)) {
    fs.writeFileSync(METADATA_FILE, '[]', 'utf-8');
  }
}

function readAll() {
  ensureStore();
  return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
}

function saveFileMetadata(record) {
  const records = readAll();
  records.push(record);
  fs.writeFileSync(METADATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  return record;
}

function getFileMetadata(fileId) {
  const records = readAll();
  return records.find((r) => r.id === fileId) || null;
}

module.exports = { saveFileMetadata, getFileMetadata };
