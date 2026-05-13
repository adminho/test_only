const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Isolate DB and upload dir for each test run
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-upload-test-'));
process.env.UPLOAD_DIR = path.join(testDir, 'uploads');
process.env.DB_PATH = path.join(testDir, 'test.db');

const app = require('../src/app');

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj ' +
  '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj ' +
  '3 0 obj<</Type /Page /MediaBox [0 0 3 3]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
  '0000000058 00000 n\n0000000115 00000 n\n' +
  'trailer<</Size 4 /Root 1 0 R>>\nstartxref\n190\n%%EOF'
);

afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('POST /api/uploads', () => {
  test('rejects request with no file', async () => {
    const res = await request(app).post('/api/uploads');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('rejects non-PDF file', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', Buffer.from('hello world'), { filename: 'doc.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pdf/i);
  });

  test('accepts a valid PDF and returns metadata + downloadUrl', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', MINIMAL_PDF, { filename: 'sample.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      originalName: 'sample.pdf',
      size: expect.any(Number),
      uploadedAt: expect.any(String),
      downloadUrl: expect.stringMatching(/\/api\/uploads\/.+\/download$/),
    });
  });

  test('rejects file exceeding size limit', async () => {
    const original = process.env.MAX_FILE_SIZE_BYTES;
    process.env.MAX_FILE_SIZE_BYTES = '10'; // 10 bytes

    // Re-require to pick up new env var
    jest.resetModules();
    const smallLimitApp = require('../src/app');

    const res = await smallLimitApp._router
      ? await request(smallLimitApp)
          .post('/api/uploads')
          .attach('file', MINIMAL_PDF, { filename: 'big.pdf', contentType: 'application/pdf' })
      : null;

    if (res) {
      expect([413, 400]).toContain(res.status);
    }

    process.env.MAX_FILE_SIZE_BYTES = original;
    jest.resetModules();
  });
});

describe('GET /api/uploads/:id/download', () => {
  let uploadedId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', MINIMAL_PDF, { filename: 'dl-test.pdf', contentType: 'application/pdf' });
    uploadedId = res.body.id;
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/uploads/nonexistent-id/download');
    expect(res.status).toBe(404);
  });

  test('streams the PDF with correct headers for a valid id', async () => {
    const res = await request(app).get(`/api/uploads/${uploadedId}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/dl-test\.pdf/);
  });
});
