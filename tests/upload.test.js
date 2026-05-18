const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../app');

const TMP_DIR = path.join(__dirname, 'tmp');

function tmpPath(name) {
  return path.join(TMP_DIR, name);
}

function createPdf(filePath, extraBytes = 0) {
  const header = '%PDF-1.4\n%%EOF\n';
  const buf = Buffer.alloc(header.length + extraBytes);
  Buffer.from(header).copy(buf);
  fs.writeFileSync(filePath, buf);
}

function createNonPdf(filePath) {
  fs.writeFileSync(filePath, 'this is not a pdf file');
}

beforeAll(() => {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
});

// TC-004: empty request body → HTTP 400
describe('TC-004: missing/empty file', () => {
  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/upload');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

});

// TC-003: PDF > 10 MB → HTTP 413
describe('TC-003: file size > 10 MB', () => {
  it('returns 413 when PDF exceeds 10 MB', async () => {
    const largePath = tmpPath('large.pdf');
    const OVER_10MB = 10 * 1024 * 1024 + 1; // 10 MB + 1 byte
    createPdf(largePath, OVER_10MB);

    const res = await request(app)
      .post('/upload')
      .attach('file', largePath);

    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty('error');
    fs.unlinkSync(largePath);
  });
});

// Happy path
describe('valid PDF upload', () => {
  it('returns 201 with metadata for a valid PDF', async () => {
    const pdfPath = tmpPath('valid.pdf');
    createPdf(pdfPath);

    const res = await request(app)
      .post('/upload')
      .attach('file', pdfPath);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message', 'File uploaded successfully');
    expect(res.body).toHaveProperty('download_url');
    expect(res.body.metadata).toHaveProperty('download_token');
    fs.unlinkSync(pdfPath);
  });
});

// Non-PDF file type
describe('non-PDF file type', () => {
  it('returns 400 for a .txt file', async () => {
    const txtPath = tmpPath('test.txt');
    createNonPdf(txtPath);

    const res = await request(app)
      .post('/upload')
      .attach('file', txtPath);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    fs.unlinkSync(txtPath);
  });

  it('returns 400 for a .pdf extension with non-PDF content', async () => {
    const fakePath = tmpPath('fake.pdf');
    fs.writeFileSync(fakePath, 'this is not a real pdf');

    const res = await request(app)
      .post('/upload')
      .attach('file', fakePath);

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    fs.unlinkSync(fakePath);
  });
});
