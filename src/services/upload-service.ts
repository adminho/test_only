import type { UploadMetadata, InsertUploadInput } from "../models/upload.js";
import { getDb } from "../db/database.js";

/**
 * Persists upload metadata after a successful file save.
 * Returns the full persisted record including the auto-assigned id.
 */
export function saveUploadMetadata(input: InsertUploadInput): UploadMetadata {
  const db = getDb();
  const uploaded_at = input.uploaded_at ?? new Date().toISOString();

  db.prepare(`
    INSERT INTO upload_metadata
      (original_filename, file_size, uploaded_by, uploaded_at, download_url)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    input.original_filename,
    input.file_size,
    input.uploaded_by,
    uploaded_at,
    input.download_url,
  );

  const record = getByDownloadUrl(input.download_url);
  if (!record) throw new Error("Failed to retrieve record after insert");
  return record;
}

/**
 * Retrieves upload metadata by its download URL.
 * Returns null when the URL is not found.
 */
export function getByDownloadUrl(downloadUrl: string): UploadMetadata | null {
  const db = getDb();

  const row = db.prepare(`
    SELECT id, original_filename, file_size, uploaded_by, uploaded_at,
           download_url, created_at
    FROM   upload_metadata
    WHERE  download_url = ?
    LIMIT  1
  `).get(downloadUrl);

  return (row as UploadMetadata | undefined) ?? null;
}

/**
 * Returns all uploads for a given user, ordered newest first.
 */
export function getByUser(uploadedBy: string): UploadMetadata[] {
  const db = getDb();

  return db.prepare(`
    SELECT id, original_filename, file_size, uploaded_by, uploaded_at,
           download_url, created_at
    FROM   upload_metadata
    WHERE  uploaded_by = ?
    ORDER  BY uploaded_at DESC
  `).all(uploadedBy) as unknown as UploadMetadata[];
}
