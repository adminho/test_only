const request = require('supertest');
const app = require('../app');
const storage = require('../storage');

jest.mock('../storage');

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\nxref\n0 0\ntrailer<</Size 1>>\n%%EOF'
);

beforeEach(() => {
  jest.clearAllMocks();
  storage.saveFile.mockImplementation(() => {});
});

describe('POST /api/upload', () => {
  it('returns 200 with a download URL when a valid PDF is uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', MINIMAL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('url');
    expect(res.body.url).toMatch(/\/files\/[a-f0-9-]+\.pdf$/);
    expect(storage.saveFile).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when a non-PDF file is uploaded', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('hello'), { filename: 'doc.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(storage.saveFile).not.toHaveBeenCalled();
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/upload');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 500 when storage fails', async () => {
    storage.saveFile.mockImplementation(() => {
      throw new Error('disk full');
    });

    const res = await request(app)
      .post('/api/upload')
      .attach('file', MINIMAL_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Storage failure');
  });
});
