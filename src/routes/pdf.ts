import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { upload, UPLOADS_DIR } from '../upload.js';
import { insertUpload, getUploadById } from '../db.js';
import type { UploadSuccessResponse, ErrorResponse } from '../types.js';

export const pdfRouter = Router();

// POST /api/upload — accept a PDF file
pdfRouter.post(
  '/upload',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const body: ErrorResponse = { error: 'File too large. Maximum size is 10 MB.' };
          res.status(413).json(body);
          return;
        }
        const body: ErrorResponse = { error: 'Upload error.', details: err.message };
        res.status(400).json(body);
        return;
      }
      if (err) {
        next(err);
        return;
      }
      next();
    });
  },
  (req: Request, res: Response) => {
    // No file received (missing or filtered out by fileFilter)
    if (!req.file) {
      const body: ErrorResponse = {
        error: 'Missing or invalid file. Only PDF files are accepted.',
      };

      // Distinguish: was the field present but wrong type, or entirely absent?
      // multer only sets req.file when the filter passes; if the field was present
      // but rejected the original name will be in req.body via busboy — we can't
      // distinguish here without custom middleware, so return 400 for both.
      res.status(400).json(body);
      return;
    }

    const uploaded_by: string =
      typeof req.body?.uploaded_by === 'string' && req.body.uploaded_by.trim()
        ? (req.body.uploaded_by as string).trim()
        : 'anonymous';

    const fileId = uuidv4();
    const uploadedAt = new Date().toISOString();

    try {
      insertUpload({
        id: fileId,
        original_filename: req.file.originalname,
        stored_filename: req.file.filename,
        file_size: req.file.size,
        uploaded_by,
        uploaded_at: uploadedAt,
        project_id: 'teestxxxxxxx',
      });
    } catch (dbErr) {
      // Metadata persist failed — remove the stored file to avoid orphans
      try {
        fs.unlinkSync(path.join(UPLOADS_DIR, req.file.filename));
      } catch {
        // best-effort cleanup
      }
      const body: ErrorResponse = {
        error: 'Storage failure. Could not persist file metadata.',
        details: dbErr instanceof Error ? dbErr.message : String(dbErr),
      };
      res.status(500).json(body);
      return;
    }

    const downloadUrl = `${req.protocol}://${req.get('host')}/api/download/${fileId}`;

    const body: UploadSuccessResponse = {
      message: 'File uploaded successfully.',
      file_id: fileId,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      uploaded_at: uploadedAt,
      download_url: downloadUrl,
    };
    res.status(201).json(body);
  },
);

// GET /api/download/:fileId — serve the stored PDF
pdfRouter.get('/download/:fileId', (req: Request, res: Response) => {
  const { fileId } = req.params;
  const record = getUploadById(fileId);

  if (!record) {
    const body: ErrorResponse = { error: 'File not found.' };
    res.status(404).json(body);
    return;
  }

  const filePath = path.join(UPLOADS_DIR, record.stored_filename);

  if (!fs.existsSync(filePath)) {
    const body: ErrorResponse = { error: 'File no longer available on disk.' };
    res.status(404).json(body);
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${record.original_filename}"`);
  res.setHeader('Content-Type', 'application/pdf');
  res.sendFile(filePath);
});
