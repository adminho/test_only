import express, { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import crypto from 'crypto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export interface FileMetadata {
  filename: string;
  originalname: string;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
}

// In-memory store for uploaded file metadata (cleared between tests)
export const fileStore: FileMetadata[] = [];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('INVALID_FILE_TYPE'));
    } else {
      cb(null, true);
    }
  },
});

/**
 * Sanitizes a filename by stripping path traversal components and
 * replacing any characters outside [a-zA-Z0-9._-] with underscores.
 */
function sanitizeFilename(name: string): string {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

export function createApp() {
  const app = express();

  app.post('/upload', (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'File too large. Maximum allowed size is 10 MB.' });
          return;
        }
        next(err);
        return;
      }

      if (err instanceof Error) {
        if (err.message === 'INVALID_FILE_TYPE') {
          res.status(400).json({ error: 'Only PDF files are accepted.' });
          return;
        }
        next(err);
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file provided. Include a file in the "file" field.' });
        return;
      }

      const sanitized = sanitizeFilename(req.file.originalname);
      const id = crypto.randomUUID();
      const downloadUrl = `/files/${id}/${sanitized}`;

      const metadata: FileMetadata = {
        filename: sanitized,
        originalname: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        downloadUrl,
      };

      fileStore.push(metadata);

      res.status(200).json({
        success: true,
        filename: metadata.filename,
        size: metadata.size,
        uploadedAt: metadata.uploadedAt,
        downloadUrl: metadata.downloadUrl,
      });
    });
  });

  // Generic error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: 'Internal server error', detail: err.message });
  });

  return app;
}
