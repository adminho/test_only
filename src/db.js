const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'uploads-meta.json');

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (_) {
    return { upload_metadata: {} };
  }
}

function writeStore(store) {
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

const db = {
  insertUpload(record) {
    const store = readStore();
    store.upload_metadata[record.file_id] = record;
    writeStore(store);
  },

  findUpload(fileId) {
    const store = readStore();
    return store.upload_metadata[fileId] || null;
  },
};

module.exports = { db };
