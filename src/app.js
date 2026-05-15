const express = require('express');
const multer = require('multer');
const { validatePdfFile } = require('./uploadValidation');

const app = express();

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided. Please attach a PDF file.' });
  }

  const result = validatePdfFile(req.file);
  if (!result.valid) {
    return res.status(400).json({ error: result.message });
  }

  return res.status(200).json({
    message: 'File uploaded successfully.',
    filename: req.file.originalname,
    size: req.file.size,
  });
});

module.exports = app;
