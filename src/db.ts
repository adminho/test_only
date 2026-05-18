import fs from 'fs';
import path from 'path';
import type { UploadMetadata } from './types.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'uploads.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): Record<string, UploadMetadata> {
  ensureDataDir();
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as Record<string, UploadMetadata>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, UploadMetadata>): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function insertUpload(meta: UploadMetadata): void {
  const store = readStore();
  store[meta.id] = meta;
  writeStore(store);
}

export function getUploadById(id: string): UploadMetadata | undefined {
  const store = readStore();
  return store[id];
}
