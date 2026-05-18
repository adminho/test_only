import type { DatabaseSync } from "node:sqlite";

export function runMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS upload_metadata (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      original_filename TEXT    NOT NULL,
      file_size         INTEGER NOT NULL,
      uploaded_by       TEXT    NOT NULL,
      uploaded_at       TEXT    NOT NULL,
      download_url      TEXT    NOT NULL UNIQUE,
      created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_upload_download_url
      ON upload_metadata (download_url);

    CREATE INDEX IF NOT EXISTS idx_upload_uploaded_by
      ON upload_metadata (uploaded_by);
  `);
}
