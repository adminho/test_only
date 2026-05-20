import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const UPLOAD_DIR = path.join(os.homedir(), '.han', 'uploads');
const METADATA_PATH = path.join(UPLOAD_DIR, 'metadata.json');
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export interface UploadRecord {
  id: string;
  originalName: string;
  storedName: string;
  size: number;
  uploadedAt: string;
}

export function sanitizeFilename(originalName: string): { id: string; storedName: string } {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 100);
  const id = crypto.randomUUID();
  return { id, storedName: `${id}_${base}${ext}` };
}

export async function isPdf(file: File): Promise<boolean> {
  if (file.type !== 'application/pdf') return false;
  if (path.extname(file.name).toLowerCase() !== '.pdf') return false;
  const header = Buffer.from(await file.slice(0, 4).arrayBuffer());
  return header.toString('ascii', 0, 4) === '%PDF';
}

export function readMetadata(): UploadRecord[] {
  if (!fs.existsSync(METADATA_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8')) as UploadRecord[];
  } catch {
    return [];
  }
}

export function appendMetadata(entry: UploadRecord): void {
  const list = readMetadata();
  list.push(entry);
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(METADATA_PATH, JSON.stringify(list, null, 2));
}

export function findById(id: string): UploadRecord | undefined {
  return readMetadata().find((r) => r.id === id);
}
