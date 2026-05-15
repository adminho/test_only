const multer = require('multer');
const { sanitizeFilename } = require('../utils/sanitizeFilename');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function createUploader(uploadDir) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, sanitizeFilename(file.originalname)),
  });

  const fileFilter = (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      // Use cb(null, false) + a flag so multer drains the stream cleanly.
      // Calling cb(err, false) causes busboy to abort mid-stream, which
      // produces ECONNRESET on the client side.
      req.fileTypeRejected = true;
      return cb(null, false);
    }
    cb(null, true);
  };

  return multer({ storage, limits: { fileSize: MAX_FILE_SIZE }, fileFilter });
}

module.exports = { createUploader, MAX_FILE_SIZE };
