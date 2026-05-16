const express = require('express');
const uploadRouter = require('./routes/upload');

const app = express();

app.use('/', uploadRouter);

// Generic error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const config = require('./config');
  app.listen(config.port, () => {
    console.log(`PDF upload API listening on port ${config.port}`);
  });
}

module.exports = app;
