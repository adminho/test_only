import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { findUploadById } from '../db/index.js';

const router = Router();

router.get('/download/:id', (req: Request, res: Response): void => {
  const { id } = req.params;

  // Basic UUID format guard to prevent path injection via parameter
  if (!id || !/^[\w-]{1,64}$/.test(id)) {
    res.status(400).json({ error: 'Invalid file ID.' });
    return;
  }

  let record: ReturnType<typeof findUploadById>;
  try {
    record = findUploadById(id);
  } catch {
    res.status(500).json({ error: 'Metadata lookup failed.' });
    return;
  }

  if (!record) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }

  if (!fs.existsSync(record.storage_path)) {
    res.status(500).json({ error: 'File missing from storage.' });
    return;
  }

  const safeName = path.basename(record.original_filename).replace(/[^\w.\-]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  fs.createReadStream(record.storage_path).pipe(res);
});

export default router;
