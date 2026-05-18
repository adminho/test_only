import { Router, type Request, type Response, type NextFunction } from 'express';
import multer, { type MulterError } from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuidv4 } from 'uuid';
import { insertUpload } from '../db/index.js';
import { sanitizeFilename } from '../utils/sanitize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Stored outside any statically-served directory
export const STORAGE_DIR = path.resolve(__dirname, '..', '..', 'storage', 'uploads');

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
});

const router = Router();

router.post('/upload', (req: Request, res: Response, next: NextFunction): void => {
  upload.single('file')(req, res, (err: unknown) => {
    // Multer-level errors
    if (err instanceof multer.MulterError) {
      if ((err as MulterError).code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'File exceeds the 10 MB size limit.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      next(err);
      return;
    }

    // Missing file
    if (!req.file) {
      res.status(400).json({ error: 'No file provided. Send a PDF as the "file" field.' });
      return;
    }

    const file = req.file;

    // Reject non-PDF by MIME type and original extension
    const originalExt = path.extname(file.originalname).toLowerCase();
    if (file.mimetype !== 'application/pdf' || originalExt !== '.pdf') {
      res.status(400).json({ error: 'Only PDF files are accepted.' });
      return;
    }

    const id = uuidv4();
    const sanitizedBase = sanitizeFilename(file.originalname);
    const storedFilename = `${id}_${sanitizedBase}`;
    const storagePath = path.join(STORAGE_DIR, storedFilename);

    // Ensure storage directory exists
    try {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    } catch {
      res.status(500).json({ error: 'Storage initialization failed.' });
      return;
    }

    // Write file to disk
    try {
      fs.writeFileSync(storagePath, file.buffer);
    } catch {
      res.status(500).json({ error: 'Failed to save file to storage.' });
      return;
    }

    const uploadedAt = new Date().toISOString();
    const uploadedBy =
      typeof req.body.uploaded_by === 'string' && req.body.uploaded_by.trim()
        ? req.body.uploaded_by.trim()
        : null;

    // Persist metadata
    try {
      insertUpload({
        id,
        original_filename: file.originalname,
        stored_filename: storedFilename,
        file_size: file.size,
        uploaded_by: uploadedBy,
        uploaded_at: uploadedAt,
        storage_path: storagePath,
      });
    } catch {
      // Roll back the saved file if metadata persistence fails
      try { fs.unlinkSync(storagePath); } catch { /* best-effort cleanup */ }
      res.status(500).json({ error: 'Failed to persist upload metadata.' });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host') ?? 'localhost'}`;
    res.status(201).json({
      id,
      download_url: `${baseUrl}/api/download/${id}`,
      original_filename: file.originalname,
      file_size: file.size,
      uploaded_at: uploadedAt,
    });
  });
});

export default router;
