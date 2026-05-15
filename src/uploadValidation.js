const ALLOWED_EXTENSION = '.pdf';
const ALLOWED_MIME_TYPE = 'application/pdf';

function validatePdfFile(file) {
  const originalName = file.originalname || '';
  const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
  const mimeType = file.mimetype || '';

  if (ext !== ALLOWED_EXTENSION) {
    return {
      valid: false,
      message: `Invalid file type: expected a PDF file but received a file with extension "${ext}". Only .pdf files are accepted.`,
    };
  }

  if (mimeType !== ALLOWED_MIME_TYPE) {
    return {
      valid: false,
      message: `Invalid MIME type: expected "application/pdf" but received "${mimeType}". Only PDF files are accepted.`,
    };
  }

  return { valid: true };
}

module.exports = { validatePdfFile };
