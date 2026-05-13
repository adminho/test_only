const { readStore, writeStore } = require('./db');

function insertUpload({ id, original_name, stored_name, file_path, size, mime_type }) {
  const record = {
    id,
    original_name,
    stored_name,
    file_path,
    size,
    mime_type,
    created_at: new Date().toISOString(),
  };
  const store = readStore();
  store.uploads.push(record);
  writeStore(store);
  return record;
}

function findById(id) {
  const store = readStore();
  return store.uploads.find((u) => u.id === id) || null;
}

function listUploads() {
  const store = readStore();
  return [...store.uploads].reverse();
}

module.exports = { insertUpload, findById, listUploads };
