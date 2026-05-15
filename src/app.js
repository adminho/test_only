const express = require('express');
const uploadRouter = require('./routes/upload');

const app = express();

app.use(express.json());

app.use('/api', uploadRouter);

// multer error handler (must have 4 args to be recognized as error middleware)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File size exceeds the 10MB limit.' });
  }
  return res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
