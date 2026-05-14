const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const app = express();

app.use('/files', express.static(UPLOAD_DIR));
app.use('/api', uploadRouter);

module.exports = app;
