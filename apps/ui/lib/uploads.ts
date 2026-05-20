import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const UPLOAD_DIR = path.join(os.homedir(), '.han', 'uploads');
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const METADATA_PATH = path.join(UPLOAD_DIR, 'metadata.json');

export interface UploadEntry {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  uploadedAt: string;
}

/** Returns a UUID-prefixed sanitized filename. */
export function sanitizeFilename(originalName: string): string {
  const safe = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${crypto.randomUUID()}-${safe}`;
}

/** Validates that the file is a real PDF via MIME type, extension, and magic bytes. */
export function isPdf(file: File, buffer: Buffer): boolean {
  if (file.type !== 'application/pdf') return false;
  if (!file.name.toLowerCase().endsWith('.pdf')) return false;
  // PDF magic number: %PDF (0x25 0x50 0x44 0x46)
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  );
}

/** Reads the persisted metadata array, returning [] when the file is absent or malformed. */
export function readMetadata(): UploadEntry[] {
  try {
    const raw = fs.readFileSync(METADATA_PATH, 'utf8');
    return JSON.parse(raw) as UploadEntry[];
  } catch {
    return [];
  }
}

/** Appends one entry to the metadata file. */
export function appendMetadata(entry: UploadEntry): void {
  const entries = readMetadata();
  entries.push(entry);
  fs.writeFileSync(METADATA_PATH, JSON.stringify(entries, null, 2), 'utf8');
}

/** Looks up an upload entry by its UUID. */
export function findById(id: string): UploadEntry | undefined {
  return readMetadata().find((e) => e.id === id);
}
