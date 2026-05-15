const request = require('supertest');
const app = require('../src/app');

describe('POST /upload', () => {
  // TC-001: Valid PDF upload accepted
  it('TC-001: accepts a valid PDF file', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/successfully/i);
    expect(res.body.filename).toBe('document.pdf');
  });

  // TC-002: Non-PDF file rejected (image.jpg)
  it('TC-002: rejects image.jpg with HTTP 400', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('fake image data'), {
        filename: 'image.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).toMatch(/\.jpg/i);
  });

  it('rejects a .txt file with HTTP 400', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('hello world'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/\.txt/i);
  });

  it('rejects a file with .pdf extension but wrong MIME type with HTTP 400', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('not really a pdf'), {
        filename: 'fake.pdf',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/MIME type/i);
  });

  it('rejects a request with no file with HTTP 400', async () => {
    const res = await request(app).post('/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });
});
