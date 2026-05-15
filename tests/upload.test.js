const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const metadataModule = require('../src/storage/metadata');

// Minimal valid PDF bytes
const MIN_PDF = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
  '0000000058 00000 n\n0000000115 00000 n\n' +
  'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
);

const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

function cleanUploads() {
  if (fs.existsSync(UPLOADS_DIR)) {
    fs.readdirSync(UPLOADS_DIR).forEach((f) => {
      if (f !== '.gitkeep') {
        fs.unlinkSync(path.join(UPLOADS_DIR, f));
      }
    });
  }
}

beforeEach(cleanUploads);
afterAll(cleanUploads);

describe('POST /api/upload', () => {
  test('returns 201 and downloadUrl for a valid PDF', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', MIN_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      filename: 'test.pdf',
      size: expect.any(Number),
      downloadUrl: expect.stringContaining('/api/files/'),
    });
  });

  test('returns 400 when no file is provided', async () => {
    const res = await request(app).post('/api/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns 400 for a non-PDF file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('hello'), { filename: 'test.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF/i);
  });

  test('returns 413 for an oversized file', async () => {
    const large = Buffer.alloc(10 * 1024 * 1024 + 1, 'x');

    const res = await request(app)
      .post('/api/upload')
      .attach('file', large, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toBeDefined();
  });

  test('returns 500 when metadata persistence fails', async () => {
    const originalSaveFile = metadataModule.saveFile;
    metadataModule.saveFile = () => { throw new Error('disk full'); };

    let res;
    try {
      res = await request(app)
        .post('/api/upload')
        .attach('file', MIN_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });
    } finally {
      metadataModule.saveFile = originalSaveFile;
    }

    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/files/:id', () => {
  test('serves the PDF after a successful upload', async () => {
    const upload = await request(app)
      .post('/api/upload')
      .attach('file', MIN_PDF, { filename: 'doc.pdf', contentType: 'application/pdf' });

    const { id } = upload.body;
    const res = await request(app).get(`/api/files/${id}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
    expect(res.headers['content-disposition']).toContain('doc.pdf');
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/files/00000000-0000-4000-8000-000000000000');
    expect(res.status).toBe(404);
  });

  test('returns 404 for an invalid id format', async () => {
    const res = await request(app).get('/api/files/../../etc/passwd');
    expect(res.status).toBe(404);
  });
});
