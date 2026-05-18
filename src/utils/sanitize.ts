import path from 'node:path';

const MAX_FILENAME_LENGTH = 200;

export function sanitizeFilename(raw: string): string {
  // Strip directory components
  const base = path.basename(raw);

  // Remove null bytes and control characters, replace unsafe chars with underscore
  const cleaned = base
    .replace(/\0/g, '')
    .replace(/[^\w.\-]/g, '_');

  // Collapse consecutive dots to prevent extension confusion
  const nodoubledots = cleaned.replace(/\.{2,}/g, '.');

  // Trim leading dots/underscores and enforce length
  const trimmed = nodoubledots.replace(/^[._]+/, '').slice(0, MAX_FILENAME_LENGTH);

  return trimmed || 'upload';
}
