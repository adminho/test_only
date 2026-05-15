const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve only the public/ directory — uploads/ and data/ are never exposed statically
app.use(express.static(path.join(__dirname, '../public')));

app.use('/api', uploadRouter);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PDF upload API listening on port ${PORT}`);
  });
}

module.exports = app;
