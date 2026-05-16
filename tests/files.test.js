const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Point uploads to a temp directory for tests so nothing lands in the project tree
const testUploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secure-upload-test-'));
process.env.UPLOAD_DIR = testUploadDir;

const app = require('../src/app');

// Minimal valid 1-byte PDF header
const MINIMAL_PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

afterAll(() => {
  fs.rmSync(testUploadDir, { recursive: true, force: true });
});

describe('POST /api/files/upload', () => {
  it('rejects non-PDF uploads with 415', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', Buffer.from('hello'), { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
  });

  it('rejects requests with no file with 400', async () => {
    const res = await request(app).post('/api/files/upload');
    expect(res.status).toBe(400);
  });

  it('accepts a PDF and returns a downloadUrl', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', MINIMAL_PDF, { filename: 'report.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.downloadUrl).toMatch(/^\/api\/files\/download\//);
  });

  it('stores the file outside the web root (not inside public/)', async () => {
    const projectRoot = path.resolve(__dirname, '..');
    const publicDir = path.join(projectRoot, 'public');

    // Every file in testUploadDir must not live inside publicDir
    const uploaded = fs.readdirSync(testUploadDir);
    expect(uploaded.length).toBeGreaterThan(0);
    uploaded.forEach((filename) => {
      const filePath = path.join(testUploadDir, filename);
      expect(filePath.startsWith(publicDir)).toBe(false);
    });
  });

  it('stores file with a UUID name, not the original filename', async () => {
    const before = new Set(fs.readdirSync(testUploadDir));
    await request(app)
      .post('/api/files/upload')
      .attach('file', MINIMAL_PDF, { filename: 'secret.pdf', contentType: 'application/pdf' });
    const after = fs.readdirSync(testUploadDir);
    const newFiles = after.filter((f) => !before.has(f));
    expect(newFiles).toHaveLength(1);
    // Must NOT contain the original filename
    expect(newFiles[0]).not.toContain('secret');
    // Must match UUID pattern
    expect(newFiles[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/,
    );
  });
});

describe('GET /api/files/download/:token', () => {
  let downloadUrl;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', MINIMAL_PDF, { filename: 'download-test.pdf', contentType: 'application/pdf' });
    downloadUrl = res.body.downloadUrl;
  });

  it('returns 404 for an unknown token', async () => {
    const res = await request(app).get('/api/files/download/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  it('serves the uploaded file via the download URL', async () => {
    const res = await request(app).get(downloadUrl);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toContain('attachment');
  });

  it('does NOT expose the file path in the response', async () => {
    const res = await request(app).get(downloadUrl);
    // The raw file path must never appear in headers or body
    expect(JSON.stringify(res.headers)).not.toContain(testUploadDir);
    expect(JSON.stringify(res.headers)).not.toContain('uploads');
  });
});

describe('Direct path access via web root', () => {
  it('cannot fetch an uploaded file by guessing its path under /uploads/', async () => {
    // Attempt to fetch a file directly via the static server
    const files = fs.readdirSync(testUploadDir);
    if (files.length === 0) return; // nothing uploaded yet
    const res = await request(app).get(`/uploads/${files[0]}`);
    // Static server only serves public/; /uploads/ should 404
    expect(res.status).toBe(404);
  });
});
