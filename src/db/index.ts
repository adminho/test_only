import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', '..', 'uploads-metadata.json');

export interface UploadRecord {
  id: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  uploaded_by: string | null;
  uploaded_at: string;
  storage_path: string;
}

function readAll(): UploadRecord[] {
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) as UploadRecord[];
  } catch {
    return [];
  }
}

function writeAll(records: UploadRecord[]): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(records, null, 2), 'utf8');
}

export function insertUpload(record: UploadRecord): void {
  const records = readAll();
  records.push(record);
  writeAll(records);
}

export function findUploadById(id: string): UploadRecord | undefined {
  return readAll().find((r) => r.id === id);
}
