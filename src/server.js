const path = require('path');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, '../uploads');
const app = createApp(uploadDir);

app.listen(PORT, () => {
  console.log(`Upload API listening on port ${PORT}`);
});
