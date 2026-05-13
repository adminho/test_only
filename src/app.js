const express = require('express');
const uploadRoutes = require('./routes/uploads');

const app = express();

app.use(express.json());

app.use('/api/uploads', uploadRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

module.exports = app;
