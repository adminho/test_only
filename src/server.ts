import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import uploadRouter from './routes/upload.js';
import downloadRouter from './routes/download.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT ?? 3000;

// Public web root — only static assets (HTML/CSS/JS). Uploaded PDFs are never placed here.
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.json());

app.use('/api/upload', uploadRouter);
app.use('/api/files', downloadRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`PDF uploads stored at: storage/uploads/ (outside public web root)`);
});

export default app;
