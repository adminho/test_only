const express = require('express');
const uploadRouter = require('./routes/upload');

const app = express();
app.use(express.json());
app.use('/api', uploadRouter);

module.exports = app;
