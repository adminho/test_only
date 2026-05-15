const express = require('express');
const path = require('path');
const { createUploader } = require('./middleware/uploadMiddleware');
const { createUploadRouter } = require('./routes/upload');

function createApp(uploadDir) {
  const app = express();
  const dir = uploadDir || path.join(__dirname, '../uploads');

  app.use(express.json());
  app.use('/uploads', express.static(dir));
  app.use('/upload', createUploadRouter(createUploader(dir)));

  return app;
}

module.exports = { createApp };
