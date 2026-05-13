const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/uploads.json');

function _load() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '{}', 'utf8');
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function _save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function insertUpload(record) {
  const data = _load();
  data[record.id] = record;
  _save(data);
}

function getUploadById(id) {
  const data = _load();
  return data[id] || null;
}

module.exports = { insertUpload, getUploadById };
