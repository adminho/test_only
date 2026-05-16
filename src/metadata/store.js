const fs = require('fs');
const config = require('../config');

function load() {
  try {
    if (fs.existsSync(config.metadataFile)) {
      return JSON.parse(fs.readFileSync(config.metadataFile, 'utf8'));
    }
  } catch {
    // corrupted file — start fresh
  }
  return {};
}

function save(records) {
  fs.writeFileSync(config.metadataFile, JSON.stringify(records, null, 2), 'utf8');
}

/**
 * Persist upload metadata and return the stored record.
 */
function create(entry) {
  const records = load();
  records[entry.id] = entry;
  save(records);
  return entry;
}

/**
 * Retrieve a single metadata record by id.
 */
function findById(id) {
  const records = load();
  return records[id] || null;
}

module.exports = { create, findById };
