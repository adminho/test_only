/**
 * Minimal JSON-backed key/value store.
 * Persists a single object to disk; reads/writes are synchronous and atomic
 * enough for a single-process server.
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');

function _load() {
  try {
    return JSON.parse(fs.readFileSync(config.dbPath, 'utf8'));
  } catch (_) {
    return { files: {} };
  }
}

function _save(data) {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  fs.writeFileSync(config.dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function insertFile(record) {
  const data = _load();
  data.files[record.id] = { ...record, uploaded_at: new Date().toISOString() };
  _save(data);
}

function findById(id) {
  return _load().files[id] || null;
}

// no-op kept so tests that call closeDb() still work
function closeDb() {}

module.exports = { insertFile, findById, closeDb };
