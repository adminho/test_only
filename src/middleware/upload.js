const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'storage', 'uploads');
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    // Use UUID regardless of original name to prevent filename-based attacks.
    cb(null, `${uuidv4()}.pdf`);
  },
});

// Accept all files here; MIME type is validated in the route handler after the
// stream is fully drained to avoid ECONNRESET when multer aborts mid-upload.
const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
});

module.exports = { upload, UPLOAD_DIR };
