'use strict';

const express = require('express');
const uploadRouter = require('./routes/upload');

const app = express();

app.use('/upload', uploadRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
