const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const storage = require('../src/storage');

// Minimal valid PDF bytes (header only — enough for MIME detection via multer)
const MINIMAL_PDF = Buffer.from('%PDF-1.4\n%%EOF\n');

afterAll(() => {
  // Clean up any files written during tests
  const uploadsDir = storage.UPLOADS_DIR;
  if (fs.existsSync(uploadsDir)) {
    for (const f of fs.readdirSync(uploadsDir)) {
      fs.unlinkSync(path.join(uploadsDir, f));
    }
  }
});

describe('POST /upload', () => {
  test('returns 200 and a download URL when a valid PDF is uploaded', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', MINIMAL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body.url).toMatch(/\/downloads\/.+\.pdf$/);
  });

  test('returns 400 when the uploaded file is not a PDF', async () => {
    const txtBuffer = Buffer.from('hello world');
    const res = await request(app)
      .post('/upload')
      .attach('file', txtBuffer, { filename: 'note.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when no file is included in the request', async () => {
    const res = await request(app).post('/upload');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 500 when storage fails', async () => {
    // Force storeFile to throw
    jest.spyOn(storage, 'storeFile').mockRejectedValueOnce(new Error('disk full'));

    const res = await request(app)
      .post('/upload')
      .attach('file', MINIMAL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');

    jest.restoreAllMocks();
  });
});
