const express = require('express');
const path = require('path');
const config = require('./config');
const filesRouter = require('./routes/files');

const app = express();

// Serve only the public/ directory as the web root.
// The uploads/ directory is a sibling of public/ and is NEVER served here.
app.use(express.static(path.resolve(__dirname, '..', 'public')));

app.use(express.json());

app.use('/api/files', filesRouter);

// Start server only when run directly (not during tests)
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
    console.log(`Upload directory (outside web root): ${config.uploadDir}`);
  });
}

module.exports = app;
