const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use isolated tmp dirs and db for each test run
const testStorageDir = path.join(os.tmpdir(), `pdf-upload-test-${process.pid}-storage`);
const testTmpDir = path.join(os.tmpdir(), `pdf-upload-test-${process.pid}-tmp`);
const testDbPath = path.join(os.tmpdir(), `pdf-upload-test-${process.pid}.json`);

process.env.STORAGE_DIR = testStorageDir;
process.env.DB_PATH = testDbPath;

// Must require app AFTER setting env vars so config picks them up
const app = require('../src/app');
const { closeDb } = require('../src/db'); // no-op for JSON store, kept for compatibility

// Minimal valid PDF header (enough to pass magic-byte check)
const MINIMAL_PDF = Buffer.concat([
  Buffer.from('%PDF-1.4\n'),
  Buffer.from('%%EOF\n'),
]);

function writeTempPdf(name = 'test.pdf') {
  const p = path.join(os.tmpdir(), name);
  fs.writeFileSync(p, MINIMAL_PDF);
  return p;
}

afterAll(() => {
  closeDb();
  [testStorageDir, testTmpDir].forEach(dir => {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  });
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
});

describe('POST /api/upload', () => {
  it('returns 200 with download_url on valid PDF upload', async () => {
    const tmpPdf = writeTempPdf('valid.pdf');
    const res = await request(app)
      .post('/api/upload')
      .attach('file', tmpPdf);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      download_url: expect.stringContaining('/api/files/'),
      original_name: 'valid.pdf',
      size_bytes: expect.any(Number),
    });
    expect(res.body.download_url).toMatch(/\/api\/files\/.+\/download$/);
    fs.unlinkSync(tmpPdf);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when file MIME type is not PDF', async () => {
    const txtPath = path.join(os.tmpdir(), 'notapdf.txt');
    fs.writeFileSync(txtPath, 'hello world');

    const res = await request(app)
      .post('/api/upload')
      .attach('file', txtPath, { contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF/i);
    fs.unlinkSync(txtPath);
  });

  it('returns 400 when file has PDF MIME type but invalid magic bytes', async () => {
    const fakePath = path.join(os.tmpdir(), 'fake.pdf');
    fs.writeFileSync(fakePath, Buffer.from('NOTAPDF content here'));

    const res = await request(app)
      .post('/api/upload')
      .attach('file', fakePath, { contentType: 'application/pdf' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/magic|content|valid PDF/i);
    fs.unlinkSync(fakePath);
  });

  it('returns 413 when file exceeds size limit', async () => {
    const bigPath = path.join(os.tmpdir(), 'big.pdf');
    // Write a 21 MB file with a valid PDF header
    const header = Buffer.from('%PDF-1.4\n');
    const filler = Buffer.alloc(21 * 1024 * 1024, 0x41); // 21 MB of 'A'
    fs.writeFileSync(bigPath, Buffer.concat([header, filler]));

    const res = await request(app)
      .post('/api/upload')
      .attach('file', bigPath, { contentType: 'application/pdf' });

    expect(res.status).toBe(413);
    fs.unlinkSync(bigPath);
  });
});

describe('GET /api/files/:id/download', () => {
  let uploadedId;

  beforeAll(async () => {
    const tmpPdf = writeTempPdf('download-test.pdf');
    const res = await request(app)
      .post('/api/upload')
      .attach('file', tmpPdf);
    uploadedId = res.body.id;
    fs.unlinkSync(tmpPdf);
  });

  it('streams back the PDF for a valid id', async () => {
    const res = await request(app).get(`/api/files/${uploadedId}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app).get('/api/files/00000000-0000-0000-0000-000000000000/download');
    expect(res.status).toBe(404);
  });
});
