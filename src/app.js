const express = require('express');
const uploadRouter = require('./routes/upload');
const filesRouter = require('./routes/files');

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/upload', uploadRouter);
app.use('/api/files', filesRouter);

// Multer errors (file size, wrong type)
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File exceeds the maximum allowed size.' });
  }
  if (err.status === 400) {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
