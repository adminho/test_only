const request = require('supertest');
const app = require('../src/app');

const ONE_MB = 1024 * 1024;
const TEN_MB = 10 * ONE_MB;

function makeBuffer(sizeBytes) {
  return Buffer.alloc(sizeBytes, 'a');
}

describe('POST /upload', () => {
  it('accepts a file under 10 MB', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', makeBuffer(ONE_MB), 'small.pdf');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully.');
  });

  it('accepts a file just under 10 MB', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', makeBuffer(TEN_MB - 1), 'near-limit.pdf');

    expect(res.status).toBe(200);
  });

  // TC-003: large.pdf > 10 MB
  it('TC-003: rejects a file larger than 10 MB with HTTP 413', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', makeBuffer(TEN_MB + 1), 'large.pdf');

    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/File too large/);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app).post('/upload');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('No file uploaded.');
  });
});
