const express = require('express');
const config = require('./config');
const uploadsRouter = require('./routes/uploads');

const app = express();

app.use(express.json());

app.use('/api/uploads', uploadsRouter);

// Centralised error handler — catches multer errors and anything thrown by routes
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Maximum size is ${config.maxFileSizeBytes / 1024 / 1024} MB` });
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`PDF upload API listening on port ${config.port}`);
  });
}

module.exports = app;
