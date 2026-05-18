import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'storage', 'uploads');

// UUID v4 pattern — rejects any path traversal attempts at the route level
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const router = Router();

router.get('/:fileId', requireAuth, (req, res) => {
  const { fileId } = req.params;

  if (!UUID_RE.test(fileId)) {
    res.status(400).json({ error: 'Invalid file ID' });
    return;
  }

  // Construct absolute path and verify it stays inside UPLOAD_DIR (defence-in-depth)
  const filePath = path.join(UPLOAD_DIR, `${fileId}.pdf`);
  if (!filePath.startsWith(UPLOAD_DIR + path.sep) && filePath !== UPLOAD_DIR) {
    res.status(400).json({ error: 'Invalid file ID' });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileId}.pdf"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fs.createReadStream(filePath).pipe(res);
});

export default router;
