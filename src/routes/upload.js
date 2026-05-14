const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { saveFile } = require('../storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(Object.assign(new Error('Only PDF files are accepted'), { code: 'INVALID_FILE_TYPE' }));
    }
  },
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filename = `${uuidv4()}.pdf`;

  try {
    saveFile(filename, req.file.buffer);
  } catch (err) {
    return res.status(500).json({ error: 'Storage failure' });
  }

  const host = req.get('host');
  const protocol = req.protocol;
  const downloadUrl = `${protocol}://${host}/files/${filename}`;

  return res.status(200).json({ url: downloadUrl });
});

// Error handler for multer/filter errors
router.use((err, _req, res, _next) => {
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: err.message });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

module.exports = router;
