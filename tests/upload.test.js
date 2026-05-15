const request = require('supertest');
const app = require('../app');

// TC-001: Valid PDF upload → HTTP 200
describe('TC-001: Valid PDF upload', () => {
  it('should accept a PDF file and return HTTP 200', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.4 test content'), {
        filename: 'document.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('File uploaded successfully.');
    expect(response.body.filename).toBe('document.pdf');
  });
});

// TC-002: JPG upload → HTTP 400
describe('TC-002: Non-PDF (JPG) upload rejected', () => {
  it('should reject a JPG file and return HTTP 400', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid file type. Only PDF files are accepted.');
  });

  it('should reject a file with a non-PDF MIME type even if extension is .pdf', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('fake-image-data'), {
        filename: 'disguised.pdf',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid file type. Only PDF files are accepted.');
  });

  it('should reject a file with a non-PDF extension even if MIME type is application/pdf', async () => {
    const response = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.4 test content'), {
        filename: 'document.png',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid file type. Only PDF files are accepted.');
  });
});

// Edge case: no file provided
describe('No file provided', () => {
  it('should return HTTP 400 when no file is attached', async () => {
    const response = await request(app).post('/upload');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('No file provided.');
  });
});
