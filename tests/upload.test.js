const request = require('supertest');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Use isolated temp dirs so tests don't collide with each other or production data.
const TEST_UPLOAD_DIR = path.join(os.tmpdir(), `pdf-upload-test-${process.pid}`);
const TEST_METADATA_FILE = path.join(os.tmpdir(), `pdf-metadata-test-${process.pid}.json`);

process.env.UPLOAD_DIR = TEST_UPLOAD_DIR;
process.env.METADATA_FILE = TEST_METADATA_FILE;
process.env.BASE_URL = 'http://localhost:3000';
process.env.MAX_FILE_SIZE_BYTES = String(5 * 1024 * 1024); // 5 MB for tests

const app = require('../src/app');

// Minimal valid PDF bytes ("%PDF-" header required by magic-byte check).
const VALID_PDF_BUFFER = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('1 0 obj\n<</Type /Catalog>>\nendobj\n'),
  Buffer.from('%%EOF\n'),
]);

afterAll(() => {
  // Clean up temp files created during tests.
  if (fs.existsSync(TEST_UPLOAD_DIR)) {
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_METADATA_FILE)) {
    fs.unlinkSync(TEST_METADATA_FILE);
  }
});

describe('POST /upload', () => {
  test('returns 200 with download URL for a valid PDF', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', VALID_PDF_BUFFER, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      originalName: 'test.pdf',
      downloadUrl: expect.stringMatching(/\/files\/[0-9a-f-]{36}$/),
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.uploadedAt).toBeDefined();
    expect(typeof res.body.size).toBe('number');
  });

  test('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('returns 400 for a non-PDF MIME type', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pdf/i);
  });

  test('returns 400 when file has PDF MIME type but invalid content', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('not a real pdf'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a valid pdf/i);
  });

  test('returns 413 when file exceeds the size limit', async () => {
    const oversized = Buffer.concat([
      Buffer.from('%PDF-'),
      Buffer.alloc(parseInt(process.env.MAX_FILE_SIZE_BYTES, 10) + 1),
    ]);

    const res = await request(app)
      .post('/upload')
      .attach('file', oversized, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/too large/i);
  });
});

describe('GET /files/:id', () => {
  let uploadedId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', VALID_PDF_BUFFER, { filename: 'download.pdf', contentType: 'application/pdf' });
    uploadedId = res.body.id;
  });

  test('returns the PDF file for a valid id', async () => {
    const res = await request(app).get(`/files/${uploadedId}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/files/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
