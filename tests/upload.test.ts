import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { handleUpload, UPLOAD_DIR, readMetadata } from '../src/uploads.js';

const PDF_MAGIC = Buffer.from('%PDF-1.4 test content');

function makePdfFile(name: string, size?: number): { type: string; name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> } {
  const bytes = size ? new Uint8Array(size) : new Uint8Array(PDF_MAGIC.length);
  // Write %PDF magic bytes at start
  bytes[0] = 0x25; bytes[1] = 0x50; bytes[2] = 0x44; bytes[3] = 0x46; // %PDF
  if (!size) {
    for (let i = 4; i < PDF_MAGIC.length; i++) bytes[i] = PDF_MAGIC[i] ?? 0;
  }
  return {
    type: 'application/pdf',
    name,
    size: bytes.length,
    // Return a standalone ArrayBuffer (no pool offset issues)
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  };
}

afterEach(() => {
  // Clean up uploaded files after each test
  const metaPath = path.join(UPLOAD_DIR, 'metadata.json');
  if (fs.existsSync(metaPath)) {
    const records = readMetadata();
    for (const r of records) {
      const fp = path.join(UPLOAD_DIR, r.storedName);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    fs.unlinkSync(metaPath);
  }
});

// TC-006: report.pdf → return download URL
describe('TC-006: return download URL on successful upload', () => {
  it('returns downloadUrl for a valid PDF upload (report.pdf)', async () => {
    const file = makePdfFile('report.pdf');
    const result = await handleUpload(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.downloadUrl).toBeDefined();
    expect(typeof result.downloadUrl).toBe('string');
    expect(result.downloadUrl).toMatch(/^\/api\/upload\/[0-9a-f-]{36}$/);
  });

  it('downloadUrl contains the assigned upload ID', async () => {
    const file = makePdfFile('report.pdf');
    const result = await handleUpload(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.downloadUrl).toBe(`/api/upload/${result.id}`);
  });

  it('returns ok:true with id, originalName, size, and downloadUrl', async () => {
    const file = makePdfFile('report.pdf');
    const result = await handleUpload(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.id).toBeDefined();
    expect(result.originalName).toBe('report.pdf');
    expect(result.size).toBe(file.size);
    expect(result.downloadUrl).toBe(`/api/upload/${result.id}`);
  });

  it('supports custom baseUrl in downloadUrl', async () => {
    const file = makePdfFile('report.pdf');
    const result = await handleUpload(file, 'https://example.com');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.downloadUrl).toMatch(/^https:\/\/example\.com\/api\/upload\//);
  });
});

describe('Upload validation', () => {
  it('rejects non-PDF files', async () => {
    const file = {
      type: 'image/png',
      name: 'image.png',
      size: 100,
      arrayBuffer: async () => Buffer.from('PNG data').buffer as ArrayBuffer,
    };
    const result = await handleUpload(file);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toContain('PDF');
  });

  it('rejects files exceeding 50 MB', async () => {
    const file = {
      type: 'application/pdf',
      name: 'big.pdf',
      size: 51 * 1024 * 1024,
      arrayBuffer: async () => new ArrayBuffer(0),
    };
    const result = await handleUpload(file);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(413);
  });

  it('rejects null file', async () => {
    const result = await handleUpload(null);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });
});
