const express = require('express');
const uploadRouter = require('./upload');

const app = express();
const PORT = process.env.PORT || 3000;

app.use('/upload', uploadRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Upload service listening on port ${PORT}`);
  });
}

module.exports = app;
