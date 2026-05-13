const fs = require('fs');
const path = require('path');
const config = require('../config');

function _ensureDir() {
  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore() {
  _ensureDir();
  if (!fs.existsSync(config.dbPath)) return { uploads: [] };
  return JSON.parse(fs.readFileSync(config.dbPath, 'utf8'));
}

function writeStore(data) {
  _ensureDir();
  fs.writeFileSync(config.dbPath, JSON.stringify(data, null, 2), 'utf8');
}

// No-op: kept so existing imports don't break
function closeDb() {}

module.exports = { readStore, writeStore, closeDb };
