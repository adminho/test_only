import type { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const expected = process.env.API_SECRET;

  if (!expected) {
    res.status(500).json({ error: 'Server misconfigured: API_SECRET not set' });
    return;
  }

  if (!token || token !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}
