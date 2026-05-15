const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

// Minimal valid PDF (starts with %PDF-)
const VALID_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 0\ntrailer\n<< >>\n%%EOF\n'),
]);

const UPLOADS_DIR = path.join(__dirname, '../uploads');

function cleanup(filename) {
  if (filename) {
    const p = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

describe('POST /api/upload', () => {
  test('400 when no file is provided', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('400 for non-PDF MIME type', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });

  test('400 for PDF MIME type with non-PDF content', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('not a real pdf'), { filename: 'fake.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });

  test('413 for files exceeding 10MB', async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0x25); // 11MB, 0x25 = '%'
    const res = await request(app)
      .post('/api/upload')
      .attach('file', oversized, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/10mb/i);
  });

  test('200 with downloadUrl for valid PDF', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', VALID_PDF, { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
    expect(res.body.filename).toMatch(/^[0-9a-f-]{36}\.pdf$/i);
    expect(res.body.downloadUrl).toContain(`/api/download/${res.body.filename}`);

    cleanup(res.body.filename);
  });

  test('stored file is outside public web root', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', VALID_PDF, { filename: 'doc.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);

    const storedPath = path.join(UPLOADS_DIR, res.body.filename);
    expect(fs.existsSync(storedPath)).toBe(true);

    // Confirm it is NOT inside a public/ directory
    expect(storedPath).not.toContain(`${path.sep}public${path.sep}`);

    cleanup(res.body.filename);
  });
});

describe('GET /api/download/:filename', () => {
  let uploadedFilename;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', VALID_PDF, { filename: 'doc.pdf', contentType: 'application/pdf' });
    uploadedFilename = res.body.filename;
  });

  afterAll(() => cleanup(uploadedFilename));

  test('200 and correct content-type for valid filename', async () => {
    const res = await request(app).get(`/api/download/${uploadedFilename}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test('path traversal attempt does not serve a file', async () => {
    // Express normalizes ../../etc/passwd in the URL before routing (→ 404),
    // and the UUID regex rejects non-UUID filenames that reach the handler (→ 400).
    // Either way the file must not be served.
    const res = await request(app).get('/api/download/../../etc/passwd');
    expect(res.status).not.toBe(200);
  });

  test('400 for non-UUID filename reaching the handler', async () => {
    const res = await request(app).get('/api/download/not-a-uuid.pdf');
    expect(res.status).toBe(400);
  });

  test('400 for filename with invalid characters', async () => {
    const res = await request(app).get('/api/download/malicious;cmd.pdf');
    expect(res.status).toBe(400);
  });

  test('404 for non-existent valid-format filename', async () => {
    const res = await request(app).get(
      '/api/download/00000000-0000-0000-0000-000000000000.pdf'
    );
    expect(res.status).toBe(404);
  });
});
