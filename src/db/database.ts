import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { runMigrations } from "./migrate.js";

const DB_PATH = process.env["DB_PATH"] ?? path.resolve("uploads.db");

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);
    runMigrations(_db);
  }
  return _db;
}

export function closeDb(): void {
  _db?.close();
  _db = null;
}
