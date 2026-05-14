const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');
const { UPLOADS_DIR } = require('./storage');

const app = express();

app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/downloads', express.static(UPLOADS_DIR));
app.use('/upload', uploadRouter);

module.exports = app;
