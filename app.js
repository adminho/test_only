'use strict';

const express = require('express');
const uploadRouter = require('./routes/upload');
const downloadRouter = require('./routes/download');

const app = express();

app.use('/upload', uploadRouter);
app.use('/download', downloadRouter);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
