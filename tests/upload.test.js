const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

const UPLOAD_DIR = path.join(__dirname, '..', 'storage', 'uploads');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Minimal valid PDF bytes
const MINIMAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nstartxref\n0\n%%EOF\n');
const MINIMAL_TXT = Buffer.from('This is a plain text file, not a PDF.');

beforeAll(() => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(FIXTURES_DIR, { recursive: true });
  fs.writeFileSync(path.join(FIXTURES_DIR, 'sample.pdf'), MINIMAL_PDF);
  fs.writeFileSync(path.join(FIXTURES_DIR, 'sample.txt'), MINIMAL_TXT);
});

afterAll(() => {
  // Clean up uploaded files created during tests
  if (fs.existsSync(UPLOAD_DIR)) {
    for (const f of fs.readdirSync(UPLOAD_DIR)) {
      fs.unlinkSync(path.join(UPLOAD_DIR, f));
    }
  }
  fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
});

describe('POST /api/upload', () => {
  test('201 with download URL on valid PDF upload', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES_DIR, 'sample.pdf'));

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('filename');
    expect(res.body.url).toMatch(/^\/api\/files\/.+\.pdf$/);
  });

  test('400 when no file is sent', async () => {
    const res = await request(app).post('/api/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('400 when file is not a PDF (wrong MIME type)', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES_DIR, 'sample.txt'));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pdf/i);
  });

  test('413 when file exceeds 10 MB', async () => {
    // 11 MB buffer with PDF header so it passes the MIME filter
    const bigPdf = Buffer.concat([
      Buffer.from('%PDF-1.4\n'),
      Buffer.alloc(11 * 1024 * 1024),
    ]);
    const tmpPath = path.join(FIXTURES_DIR, 'big.pdf');
    fs.writeFileSync(tmpPath, bigPdf);

    const res = await request(app)
      .post('/api/upload')
      .attach('file', tmpPath);

    fs.unlinkSync(tmpPath);
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/10mb/i);
  });
});

describe('GET /api/files/:filename', () => {
  let uploadedFilename;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', path.join(FIXTURES_DIR, 'sample.pdf'));
    uploadedFilename = res.body.filename;
  });

  test('200 and PDF content-type for existing file', async () => {
    const res = await request(app).get(`/api/files/${uploadedFilename}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test('404 for non-existent file', async () => {
    const res = await request(app).get('/api/files/nonexistent.pdf');

    expect(res.status).toBe(404);
  });

  test('404 (no path traversal) for ../ attempts', async () => {
    const res = await request(app).get('/api/files/../../package.json');

    expect(res.status).toBe(404);
  });
});
