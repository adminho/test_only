const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');

// Minimal valid PDF (contains %PDF magic bytes and valid structure)
const VALID_PDF = Buffer.from(
  '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\n' +
  'xref\n0 4\n' +
  '0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
  'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
);

// 11 MB buffer of PDF magic + padding to exceed limit
const OVERSIZED_PDF = Buffer.concat([
  Buffer.from('%PDF-1.0\n'),
  Buffer.alloc(11 * 1024 * 1024, 0x20),
]);

// Non-PDF file (PNG magic bytes)
const FAKE_PDF = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

afterAll(() => {
  // Clean up test uploads and metadata written during tests
  const uploadsDir = path.join(__dirname, '../uploads');
  if (fs.existsSync(uploadsDir)) {
    for (const f of fs.readdirSync(uploadsDir)) {
      if (f !== '.gitkeep') fs.unlinkSync(path.join(uploadsDir, f));
    }
  }
  const metadataFile = path.join(__dirname, '../data/metadata.json');
  if (fs.existsSync(metadataFile)) {
    fs.writeFileSync(metadataFile, '[]', 'utf-8');
  }
});

describe('POST /api/upload', () => {
  test('201 – valid PDF upload returns file_id and download_url', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', VALID_PDF, { filename: 'report.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      message: 'File uploaded successfully',
      original_filename: 'report.pdf',
    });
    expect(res.body.file_id).toBeDefined();
    expect(res.body.download_url).toMatch(/\/api\/files\/.+\/download$/);
    expect(typeof res.body.file_size).toBe('number');
    expect(res.body.uploaded_at).toBeDefined();
  });

  test('400 – missing file field', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no file/i);
  });

  test('400 – non-PDF MIME type is rejected', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', Buffer.from('hello'), { filename: 'doc.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });

  test('400 – PDF MIME but non-PDF magic bytes is rejected', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', FAKE_PDF, { filename: 'tricky.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid file type/i);
  });

  test('413 – file exceeding 10 MB is rejected', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', OVERSIZED_PDF, { filename: 'big.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/10 mb/i);
  });
});

describe('GET /api/files/:id/download', () => {
  test('404 – unknown file id', async () => {
    const res = await request(app).get('/api/files/nonexistent-id/download');
    expect(res.status).toBe(404);
  });

  test('200 – can download a previously uploaded file', async () => {
    const upload = await request(app)
      .post('/api/upload')
      .attach('file', VALID_PDF, { filename: 'fetch me.pdf', contentType: 'application/pdf' });

    expect(upload.status).toBe(201);
    const { file_id } = upload.body;

    const download = await request(app).get(`/api/files/${file_id}/download`);
    expect(download.status).toBe(200);
    expect(download.headers['content-disposition']).toMatch(/fetch_me\.pdf/);
  });
});

describe('filename sanitization', () => {
  test('path traversal characters are stripped from stored name', async () => {
    const res = await request(app)
      .post('/api/upload')
      .attach('file', VALID_PDF, {
        filename: '../../etc/passwd.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    // The download URL should not contain the traversal path
    expect(res.body.download_url).not.toContain('..');
  });
});
