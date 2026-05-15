const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

const ALLOWED_MIME_TYPE = 'application/pdf';
const ALLOWED_EXTENSION = '.pdf';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ALLOWED_EXTENSION || file.mimetype !== ALLOWED_MIME_TYPE) {
      return cb(Object.assign(new Error('Only PDF files are allowed'), { code: 'INVALID_FILE_TYPE' }));
    }
    cb(null, true);
  },
});

app.post('/upload', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err && err.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ error: 'Invalid file type. Only PDF files are accepted.' });
    }
    if (err) {
      return res.status(500).json({ error: 'Upload failed.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided.' });
    }
    return res.status(200).json({ message: 'File uploaded successfully.', filename: req.file.originalname });
  });
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
