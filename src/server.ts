import express from 'express';
import uploadRouter from './routes/upload.js';
import downloadRouter from './routes/download.js';

const app = express();
const PORT = Number(process.env['PORT'] ?? 3000);

// Parse JSON bodies for non-file routes
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', uploadRouter);
app.use('/api', downloadRouter);

// Generic error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`PDF upload API listening on port ${PORT}`);
});

export default app;
