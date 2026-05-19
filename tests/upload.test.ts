import request from 'supertest';
import { createApp, fileStore } from '../src/upload-server';

const PDF_MAGIC = Buffer.from('%PDF-1.4 mock pdf content');
const JPG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

describe('Upload API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
    fileStore.length = 0;
  });

  // TC-001 ---------------------------------------------------------------
  it('TC-001: accepts a valid PDF, returns 200, and saves metadata', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', PDF_MAGIC, { filename: 'document.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.filename).toBe('document.pdf');
    expect(typeof res.body.size).toBe('number');
    expect(res.body.size).toBeGreaterThan(0);
    expect(res.body.uploadedAt).toBeDefined();
    expect(res.body.downloadUrl).toBeDefined();

    // Metadata persisted to store
    expect(fileStore).toHaveLength(1);
    expect(fileStore[0]?.filename).toBe('document.pdf');
    expect(fileStore[0]?.size).toBe(PDF_MAGIC.length);
    expect(fileStore[0]?.uploadedAt).toBeDefined();
    expect(fileStore[0]?.downloadUrl).toBeDefined();
  });

  // TC-002 ---------------------------------------------------------------
  it('TC-002: rejects a JPG file with HTTP 400', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', JPG_MAGIC, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pdf/i);
    expect(fileStore).toHaveLength(0);
  });

  // TC-003 ---------------------------------------------------------------
  it('TC-003: rejects a PDF over 10 MB with HTTP 413', async () => {
    // 11 MB buffer — exceeds the 10 MB limit
    const oversized = Buffer.alloc(11 * 1024 * 1024, 0x25); // 0x25 = '%'

    const res = await request(app)
      .post('/upload')
      .attach('file', oversized, { filename: 'huge.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/large|size/i);
    expect(fileStore).toHaveLength(0);
  }, 15_000); // allow extra time for 11 MB transfer

  // TC-004 ---------------------------------------------------------------
  it('TC-004: returns HTTP 400 when no file is included', async () => {
    const res = await request(app).post('/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(fileStore).toHaveLength(0);
  });

  // TC-005 ---------------------------------------------------------------
  it('TC-005: sanitizes an unsafe filename (path-traversal stripped)', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', PDF_MAGIC, {
        filename: '../../etc/passwd.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);

    const { filename } = res.body as { filename: string };

    // No path traversal sequences
    expect(filename).not.toContain('..');
    expect(filename).not.toContain('/');
    expect(filename).not.toContain('\\');

    // Still ends with .pdf
    expect(filename).toMatch(/\.pdf$/i);

    // Persisted filename is also sanitized
    expect(fileStore[0]?.filename).toBe(filename);
  });

  // TC-006 ---------------------------------------------------------------
  it('TC-006: success response includes a non-empty downloadUrl', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', PDF_MAGIC, { filename: 'report.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);

    const { downloadUrl } = res.body as { downloadUrl: string };

    expect(typeof downloadUrl).toBe('string');
    expect(downloadUrl.length).toBeGreaterThan(0);
    // URL must reference the sanitized filename
    expect(downloadUrl).toContain('report.pdf');
  });
});
