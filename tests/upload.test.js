'use strict';

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../app');
const { sanitizeFilename } = require('../utils/sanitize');

const VALID_PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
const INVALID_PDF = Buffer.from('This is not a PDF file');

// Helpers
const DB_PATH = path.join(__dirname, '..', 'data', 'uploads.json');
const UPLOAD_DIR = path.join(__dirname, '..', 'private_uploads');

function clearDb() {
  if (fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '[]');
}

function clearUploads() {
  if (fs.existsSync(UPLOAD_DIR)) {
    fs.readdirSync(UPLOAD_DIR).forEach((f) => fs.unlinkSync(path.join(UPLOAD_DIR, f)));
  }
}

beforeEach(() => {
  clearDb();
  clearUploads();
});

afterAll(() => {
  clearDb();
  clearUploads();
});

// ── TC-001: missing file ───────────────────────────────────────────────────────
describe('TC-001: missing file', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ── TC-002: non-PDF MIME type ──────────────────────────────────────────────────
describe('TC-002: non-PDF file type', () => {
  it('returns 400 for a .txt file', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });
});

// ── TC-003: invalid PDF content ────────────────────────────────────────────────
describe('TC-003: invalid PDF content', () => {
  it('returns 400 when file has .pdf extension but invalid magic bytes', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', INVALID_PDF, { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid pdf/i);
  });
});

// ── TC-004: file too large ─────────────────────────────────────────────────────
describe('TC-004: file size limit', () => {
  it('returns 413 when file exceeds 10 MB', async () => {
    const bigFile = Buffer.alloc(11 * 1024 * 1024, '%');
    bigFile.write('%PDF-', 0);
    const res = await request(app)
      .post('/upload')
      .attach('file', bigFile, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
  });
});

// ── TC-005: filename sanitization ─────────────────────────────────────────────
describe('TC-005: filename sanitization', () => {
  // Unit tests for the sanitizeFilename utility
  describe('sanitizeFilename unit tests', () => {
    it('strips path traversal sequences (../../)', () => {
      // No extension in input → function appends .pdf fallback
      expect(sanitizeFilename('../../etc/passwd')).toBe('passwd.pdf');
    });

    it('strips path traversal sequences with mixed separators', () => {
      expect(sanitizeFilename('..\\..\\windows\\system32\\file.pdf')).toBe('file.pdf');
    });

    it('strips path traversal from a realistic attack filename', () => {
      const result = sanitizeFilename('../../test.pdf');
      expect(result).toBe('test.pdf');
      expect(result).not.toContain('..');
      expect(result).not.toContain('/');
      expect(result).not.toContain('\\');
    });

    it('removes unsafe characters (<, >, :, |, ?, *)', () => {
      expect(sanitizeFilename('my<bad>file:.pdf')).toBe('mybadfile.pdf');
    });

    it('removes null bytes', () => {
      const malicious = 'file\x00.pdf';
      expect(sanitizeFilename(malicious)).not.toContain('\x00');
    });

    it('collapses consecutive dots', () => {
      expect(sanitizeFilename('my...file.pdf')).toBe('my.file.pdf');
    });

    it('falls back to "upload.pdf" for empty/null input', () => {
      expect(sanitizeFilename('')).toBe('upload.pdf');
      expect(sanitizeFilename(null)).toBe('upload.pdf');
    });

    it('preserves a normal filename unchanged', () => {
      expect(sanitizeFilename('report-2024.pdf')).toBe('report-2024.pdf');
    });
  });

  // Integration test: sanitized name is what gets stored and returned
  describe('integration: sanitized name used in metadata and response', () => {
    it('accepts upload with traversal filename and stores sanitized name', async () => {
      const res = await request(app)
        .post('/upload')
        .attach('file', VALID_PDF, {
          filename: '../../test.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      // The returned filename must not contain traversal sequences
      expect(res.body.filename).toBeDefined();
      expect(res.body.filename).not.toContain('..');
      expect(res.body.filename).not.toContain('/');
      expect(res.body.filename).not.toContain('\\');
      // Should resolve to the clean basename
      expect(res.body.filename).toBe('test.pdf');
    });

    it('sanitized name is persisted in database metadata', async () => {
      await request(app)
        .post('/upload')
        .attach('file', VALID_PDF, {
          filename: '../../malicious.pdf',
          contentType: 'application/pdf',
        });

      const records = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      expect(records).toHaveLength(1);
      expect(records[0].original_filename).toBe('malicious.pdf');
      expect(records[0].original_filename).not.toContain('..');
    });

    it('sanitized name appears in Content-Disposition on download', async () => {
      const uploadRes = await request(app)
        .post('/upload')
        .attach('file', VALID_PDF, {
          filename: '../../test.pdf',
          contentType: 'application/pdf',
        });

      const token = uploadRes.body.download_url.split('/').pop();
      const downloadRes = await request(app).get(`/download/${token}`);

      expect(downloadRes.status).toBe(200);
      const disposition = downloadRes.headers['content-disposition'];
      expect(disposition).toContain('test.pdf');
      expect(disposition).not.toContain('..');
    });
  });
});

// ── TC-006: valid upload round-trip ───────────────────────────────────────────
describe('TC-006: valid PDF upload', () => {
  it('returns 201 with download_url and metadata for a valid PDF', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', VALID_PDF, { filename: 'document.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.download_url).toMatch(/^\/download\//);
    expect(res.body.filename).toBe('document.pdf');
    expect(res.body.file_size).toBeGreaterThan(0);
  });

  it('allows downloading the uploaded file', async () => {
    const uploadRes = await request(app)
      .post('/upload')
      .attach('file', VALID_PDF, { filename: 'document.pdf', contentType: 'application/pdf' });

    const token = uploadRes.body.download_url.split('/').pop();
    const downloadRes = await request(app).get(`/download/${token}`);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toMatch(/pdf/);
  });
});
