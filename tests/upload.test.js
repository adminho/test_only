const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Helper: create a minimal valid PDF buffer
function makePdfBuffer(size = 100) {
  const header = '%PDF-1.4\n';
  const padding = 'x'.repeat(Math.max(0, size - header.length));
  return Buffer.from(header + padding);
}

// Helper: create a non-PDF buffer
function makeTextBuffer() {
  return Buffer.from('This is a plain text file, not a PDF.');
}

afterAll(() => {
  // Clean up any uploaded test files
  if (fs.existsSync(UPLOADS_DIR)) {
    fs.readdirSync(UPLOADS_DIR).forEach((f) => {
      fs.unlinkSync(path.join(UPLOADS_DIR, f));
    });
  }
});

describe('POST /upload', () => {
  test('returns 400 when no file is provided', async () => {
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 400 when a non-PDF file is uploaded', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', makeTextBuffer(), { filename: 'doc.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 413 when file exceeds 10 MB', async () => {
    const oversized = Buffer.alloc(11 * 1024 * 1024, '%');
    const res = await request(app)
      .post('/upload')
      .attach('file', oversized, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty('error');
  });

  test('returns 200 with downloadUrl for a valid PDF', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', makePdfBuffer(512), { filename: 'test.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('downloadUrl');
    expect(res.body.downloadUrl).toMatch(/\/files\/.+\.pdf$/);
  });
});
