const path = require('path');
const fs = require('fs');
const os = require('os');

// Set env vars before any module is required so db and multer pick them up
const testDbPath = path.join(os.tmpdir(), `test-uploads-${Date.now()}.json`);
const testUploadsDir = path.join(os.tmpdir(), `test-uploads-dir-${Date.now()}`);
process.env.DB_PATH = testDbPath;
process.env.UPLOADS_DIR = testUploadsDir;

fs.mkdirSync(testUploadsDir, { recursive: true });

const request = require('supertest');
const app = require('../src/app');

afterAll(() => {
  try { fs.unlinkSync(testDbPath); } catch (_) {}
  try { fs.rmSync(testUploadsDir, { recursive: true, force: true }); } catch (_) {}
});

describe('POST /upload', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/upload')
      .set('X-User-Id', 'user-1');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No file provided/);
  });

  it('returns 400 when X-User-Id is missing', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('hello'), 'hello.txt');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing uploader identifier/);
  });

  it('persists metadata and returns 201 on success', async () => {
    const fileContent = 'test file content';
    const res = await request(app)
      .post('/upload')
      .set('X-User-Id', 'user-42')
      .attach('file', Buffer.from(fileContent), 'report.txt');

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      original_filename: 'report.txt',
      file_size: Buffer.byteLength(fileContent),
      uploaded_by: 'user-42',
    });
    expect(res.body.file_id).toBeTruthy();
    // ISO 8601 timestamp
    expect(res.body.uploaded_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('accepts user_id as query param when header is absent', async () => {
    const res = await request(app)
      .post('/upload?user_id=user-via-query')
      .attach('file', Buffer.from('data'), 'data.bin');

    expect(res.status).toBe(201);
    expect(res.body.uploaded_by).toBe('user-via-query');
  });

  it('metadata is retrievable from the JSON store after upload', async () => {
    const res = await request(app)
      .post('/upload')
      .set('X-User-Id', 'user-store-check')
      .attach('file', Buffer.from('persist me'), 'persist.txt');

    expect(res.status).toBe(201);
    const store = JSON.parse(fs.readFileSync(testDbPath, 'utf8'));
    expect(store.upload_metadata[res.body.file_id]).toMatchObject({
      original_filename: 'persist.txt',
      uploaded_by: 'user-store-check',
    });
  });
});

describe('GET /upload/:fileId', () => {
  let uploadedFileId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/upload')
      .set('X-User-Id', 'user-99')
      .attach('file', Buffer.from('sample'), 'sample.csv');
    uploadedFileId = res.body.file_id;
  });

  it('returns stored metadata for a known file_id', async () => {
    const res = await request(app).get(`/upload/${uploadedFileId}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      file_id: uploadedFileId,
      original_filename: 'sample.csv',
      uploaded_by: 'user-99',
    });
    expect(res.body.file_size).toBe(Buffer.byteLength('sample'));
    expect(res.body.uploaded_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns 404 for an unknown file_id', async () => {
    const res = await request(app).get('/upload/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/File not found/);
  });
});
