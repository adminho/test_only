const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Point config at temp dirs so tests don't pollute the project
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-upload-test-'));
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');
process.env.DB_PATH = path.join(tmpDir, 'test.db');
process.env.BASE_URL = 'http://localhost:3000';

const app = require('../src/app');
const { closeDb } = require('../src/models/db');

// Minimal valid single-page PDF (hand-crafted, well under 1 KB)
const MINIMAL_PDF = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj ' +
  '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj ' +
  '3 0 obj<</Type /Page /MediaBox [0 0 3 3]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n' +
  '0000000058 00000 n \n0000000115 00000 n \n' +
  'trailer<</Size 4 /Root 1 0 R>>\nstartxref\n190\n%%EOF\n'
);

afterAll(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('POST /api/uploads', () => {
  test('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/uploads');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('returns 400 when a non-PDF file is uploaded', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', Buffer.from('not a pdf'), { filename: 'bad.pdf', contentType: 'application/pdf' });
    // Content passes MIME/ext check but fails magic-bytes validation
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a valid PDF/i);
  });

  test('returns 400 when the MIME type is not application/pdf', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', MINIMAL_PDF, { filename: 'doc.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
  });

  test('successfully uploads a valid PDF and returns metadata + download URL', async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', MINIMAL_PDF, { filename: 'sample.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      original_name: 'sample.pdf',
      mime_type: 'application/pdf',
    });
    expect(res.body.id).toBeTruthy();
    expect(res.body.size).toBeGreaterThan(0);
    expect(res.body.download_url).toMatch(/\/api\/uploads\/.+\/download$/);
    expect(res.body.created_at).toBeTruthy();
  });
});

describe('GET /api/uploads/:id', () => {
  let uploadedId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', MINIMAL_PDF, { filename: 'meta-test.pdf', contentType: 'application/pdf' });
    uploadedId = res.body.id;
  });

  test('returns metadata for an existing upload', async () => {
    const res = await request(app).get(`/api/uploads/${uploadedId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(uploadedId);
    expect(res.body.original_name).toBe('meta-test.pdf');
  });

  test('returns 404 for a non-existent ID', async () => {
    const res = await request(app).get('/api/uploads/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/uploads/:id/download', () => {
  let uploadedId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/uploads')
      .attach('file', MINIMAL_PDF, { filename: 'download-test.pdf', contentType: 'application/pdf' });
    uploadedId = res.body.id;
  });

  test('streams the PDF with correct Content-Type', async () => {
    const res = await request(app).get(`/api/uploads/${uploadedId}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  test('returns 404 for a non-existent ID', async () => {
    const res = await request(app).get('/api/uploads/00000000-0000-0000-0000-000000000000/download');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/uploads', () => {
  test('returns an array of uploads', async () => {
    const res = await request(app).get('/api/uploads');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
