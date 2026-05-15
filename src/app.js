const express = require('express');
const uploadRoutes = require('./routes/upload');

const app = express();

app.use(express.json());
app.use('/api', uploadRoutes);

module.exports = app;
