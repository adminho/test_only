/**
 * Integration tests for POST /upload
 * Covers all six scenarios from the Upload Test Matrix spreadsheet.
 *
 * TC-001  valid PDF upload succeeds with metadata saved
 * TC-002  JPG rejected with HTTP 400
 * TC-003  oversized PDF rejected with HTTP 413
 * TC-004  missing file rejected with HTTP 400
 * TC-005  unsafe filename is sanitized before save
 * TC-006  successful upload returns download URL
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { createApp } = require('../../src/app');

// Minimal valid PDF content (satisfies PDF magic bytes).
const PDF_CONTENT = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(512, 65)]);

// JPEG magic bytes — used for the rejected-filetype test.
const JPEG_CONTENT = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

describe('Upload API — Integration (Upload Test Matrix)', () => {
  let app;
  let uploadDir;

  // Paths to temporary fixture files created once for the suite.
  let validPdfPath;
  let jpgPath;
  let oversizedPdfPath;
  let unsafeNameSourcePath;

  beforeAll(() => {
    // Isolated temp directory so tests don't collide with each other or with uploads/.
    uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-api-test-'));
    app = createApp(uploadDir);

    validPdfPath = path.join(uploadDir, '_fixture_valid.pdf');
    fs.writeFileSync(validPdfPath, PDF_CONTENT);

    jpgPath = path.join(uploadDir, '_fixture_photo.jpg');
    fs.writeFileSync(jpgPath, JPEG_CONTENT);

    // 6 MB — exceeds the 5 MB limit.
    oversizedPdfPath = path.join(uploadDir, '_fixture_large.pdf');
    fs.writeFileSync(oversizedPdfPath, Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(6 * 1024 * 1024, 65)]));

    // Source file for the unsafe-filename test (the name is supplied at attach time).
    unsafeNameSourcePath = path.join(uploadDir, '_fixture_unsafe_source.pdf');
    fs.writeFileSync(unsafeNameSourcePath, PDF_CONTENT);
  });

  afterAll(() => {
    fs.rmSync(uploadDir, { recursive: true, force: true });
  });

  // ──────────────────────────────────────────────────────────────────────
  // TC-001 — valid PDF upload succeeds with metadata saved
  // ──────────────────────────────────────────────────────────────────────
  test('TC-001: valid PDF upload succeeds (HTTP 200) and metadata is persisted', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', validPdfPath, { filename: 'report.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');

    // Metadata shape
    const { metadata } = res.body;
    expect(metadata).toBeDefined();
    expect(metadata.originalName).toBe('report.pdf');
    expect(metadata.savedAs).toBe('report.pdf');
    expect(metadata.mimetype).toBe('application/pdf');
    expect(metadata.size).toBeGreaterThan(0);
    expect(metadata.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO 8601

    // File actually written to disk
    expect(fs.existsSync(path.join(uploadDir, 'report.pdf'))).toBe(true);
  });

  // ──────────────────────────────────────────────────────────────────────
  // TC-002 — non-PDF (JPG) rejected with HTTP 400
  // ──────────────────────────────────────────────────────────────────────
  test('TC-002: JPG upload rejected with HTTP 400 and descriptive error', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', jpgPath, { filename: 'photo.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error).toMatch(/pdf/i);
  });

  // ──────────────────────────────────────────────────────────────────────
  // TC-003 — oversized PDF rejected with HTTP 413
  // ──────────────────────────────────────────────────────────────────────
  test('TC-003: PDF exceeding 5 MB rejected with HTTP 413', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', oversizedPdfPath, { filename: 'large.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error).toBeDefined();
  });

  // ──────────────────────────────────────────────────────────────────────
  // TC-004 — missing file field rejected with HTTP 400
  // ──────────────────────────────────────────────────────────────────────
  test('TC-004: request without a file attachment rejected with HTTP 400', async () => {
    // Do NOT set Content-Type manually — adding multipart/form-data without
    // a boundary causes busboy to reject the request before reaching our handler.
    // Sending a plain POST with no body lets multer detect "no multipart" and
    // call the callback with no file, which our handler converts to a 400.
    const res = await request(app)
      .post('/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.toLowerCase()).toContain('file');
  });

  // ──────────────────────────────────────────────────────────────────────
  // TC-005 — unsafe filename sanitized before save
  // ──────────────────────────────────────────────────────────────────────
  test('TC-005: unsafe filename characters are sanitized before save; original name preserved in metadata', async () => {
    // Note: busboy (the multipart parser underlying multer) strips directory
    // separators from originalname before multer receives it, so path-traversal
    // via "/" is neutralized at the transport layer — that behaviour is tested
    // exhaustively in the unit suite. Here we test characters that DO survive
    // the transport layer: spaces, parentheses, and angle brackets.
    const unsafeName = 'my report (2024) <draft>.pdf';
    // sanitizeFilename output: spaces/parens/angles → underscores
    const expectedSavedAs = 'my_report__2024___draft_.pdf';

    const res = await request(app)
      .post('/upload')
      .attach('file', unsafeNameSourcePath, { filename: unsafeName, contentType: 'application/pdf' });

    expect(res.status).toBe(200);

    const { metadata } = res.body;

    // Original name must be stored exactly as received.
    expect(metadata.originalName).toBe(unsafeName);

    // Saved name must have all unsafe characters replaced.
    expect(metadata.savedAs).toBe(expectedSavedAs);
    expect(metadata.savedAs).not.toContain(' ');
    expect(metadata.savedAs).not.toContain('(');
    expect(metadata.savedAs).not.toContain(')');
    expect(metadata.savedAs).not.toContain('<');
    expect(metadata.savedAs).not.toContain('>');

    // The file exists on disk under the sanitized name.
    expect(fs.existsSync(path.join(uploadDir, metadata.savedAs))).toBe(true);

    // The unsafe name must NOT exist on disk.
    expect(fs.existsSync(path.join(uploadDir, unsafeName))).toBe(false);
  });

  // ──────────────────────────────────────────────────────────────────────
  // TC-006 — successful upload returns a download URL
  // ──────────────────────────────────────────────────────────────────────
  test('TC-006: successful upload response includes a reachable download URL', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', validPdfPath, { filename: 'invoice.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(200);

    const { downloadUrl } = res.body;
    expect(downloadUrl).toBeDefined();
    expect(typeof downloadUrl).toBe('string');
    expect(downloadUrl).toMatch(/^\/uploads\//);
    expect(downloadUrl).toContain('invoice.pdf');

    // The URL must resolve to a real file via the static-file middleware.
    const downloadRes = await request(app).get(downloadUrl);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers['content-type']).toMatch(/pdf/i);
  });
});
