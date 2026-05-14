const fs = require('fs');
const config = require('../config');

const PDF_MAGIC = Buffer.from('%PDF');

/**
 * Multer fileFilter — accepts all files so the stream is always consumed.
 * MIME type is validated in validatePdfMagic() after multer stores the temp file,
 * which avoids ECONNRESET caused by rejecting the stream mid-upload in multer 1.x.
 */
function multerPdfFilter(_req, _file, cb) {
  cb(null, true);
}

/**
 * Express middleware that runs after multer has stored the temp file.
 * Checks MIME type, then reads the first 4 bytes to verify the PDF magic signature.
 * Removes the temp file and returns 400 if validation fails.
 */
async function validatePdfMagic(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Use field name "file".' });
  }

  if (req.file.mimetype !== config.upload.allowedMimeType) {
    try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    return res.status(400).json({ error: 'Only PDF files are accepted.' });
  }

  let fd;
  try {
    fd = fs.openSync(req.file.path, 'r');
    const header = Buffer.alloc(4);
    fs.readSync(fd, header, 0, 4, 0);
    fs.closeSync(fd);
    fd = null;

    if (!header.equals(PDF_MAGIC)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File content does not match a valid PDF.' });
    }

    next();
  } catch (err) {
    if (fd != null) fs.closeSync(fd);
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
    }
    next(err);
  }
}

module.exports = { multerPdfFilter, validatePdfMagic };
