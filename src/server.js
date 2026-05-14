const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`PDF upload API listening on port ${config.port}`);
});
