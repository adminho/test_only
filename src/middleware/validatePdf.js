const fs = require('fs');

// PDF magic bytes: %PDF  (hex 25 50 44 46)
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

/**
 * After multer writes the file, verify the first 4 bytes match the PDF magic number.
 * This guards against a renamed non-PDF file bypassing the MIME/extension check.
 */
function validatePdfMagicBytes(req, res, next) {
  if (!req.file) return next();

  const fd = fs.openSync(req.file.path, 'r');
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);

  if (!buf.equals(PDF_MAGIC)) {
    fs.unlinkSync(req.file.path); // remove the invalid file
    return res.status(400).json({ error: 'File content is not a valid PDF' });
  }

  next();
}

module.exports = validatePdfMagicBytes;
