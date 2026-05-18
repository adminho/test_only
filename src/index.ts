import express, { Request, Response, NextFunction } from 'express';
import { pdfRouter } from './routes/pdf.js';
import type { ErrorResponse } from './types.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', pdfRouter);

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[unhandled error]', err);
  const body: ErrorResponse = {
    error: 'Internal server error.',
    details: err instanceof Error ? err.message : String(err),
  };
  res.status(500).json(body);
});

app.listen(PORT, () => {
  console.log(`PDF upload API listening on http://localhost:${PORT}`);
  console.log('  POST /api/upload    — upload a PDF (multipart/form-data, field: file)');
  console.log('  GET  /api/download/:fileId — download a previously uploaded PDF');
});
