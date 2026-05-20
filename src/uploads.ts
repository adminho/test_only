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

export interface UploadResult {
  ok: true;
  id: string;
  originalName: string;
  size: number;
  downloadUrl: string;
}

export interface UploadError {
  ok: false;
  error: string;
  status: number;
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

export async function isPdf(file: { type: string; name: string; arrayBuffer(): Promise<ArrayBuffer> }): Promise<boolean> {
  if (file.type !== 'application/pdf') return false;
  if (path.extname(file.name).toLowerCase() !== '.pdf') return false;
  const ab = await file.arrayBuffer();
  // Use DataView to read from the correct byteOffset of the ArrayBuffer
  const view = new Uint8Array(ab, 0, Math.min(4, ab.byteLength));
  const header = Buffer.from(view);
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

export async function handleUpload(
  file: { type: string; name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } | null,
  baseUrl = '',
): Promise<UploadResult | UploadError> {
  if (!file) {
    return { ok: false, error: 'Missing or invalid file field', status: 400 };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, error: 'File exceeds 50 MB limit', status: 413 };
  }

  if (!(await isPdf(file))) {
    return { ok: false, error: 'Only PDF files are accepted', status: 400 };
  }

  const { id, storedName } = sanitizeFilename(file.name);

  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, error: 'Failed to save file to storage', status: 500 };
  }

  try {
    appendMetadata({
      id,
      originalName: file.name,
      storedName,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch {
    // metadata failure is non-fatal; file is already saved
  }

  return {
    ok: true,
    id,
    originalName: file.name,
    size: file.size,
    downloadUrl: `${baseUrl}/api/upload/${id}`,
  };
}
