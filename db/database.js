'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'uploads.json');

function readDb() {
  if (!fs.existsSync(DB_PATH)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeDb(records) {
  fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), 'utf8');
}

function insertRecord(record) {
  const records = readDb();
  records.push(record);
  writeDb(records);
}

function findByToken(token) {
  return readDb().find((r) => r.download_token === token) || null;
}

module.exports = { insertRecord, findByToken };
