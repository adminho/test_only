const fs = require('fs');
const path = require('path');

const METADATA_PATH = path.resolve(__dirname, '../../uploads/metadata.json');

function read() {
  if (!fs.existsSync(METADATA_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveFile(id, record) {
  const data = read();
  data[id] = record;
  fs.writeFileSync(METADATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getFile(id) {
  return read()[id] || null;
}

module.exports = { saveFile, getFile };
