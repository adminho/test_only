const path = require('path');

const UNSAFE_CHARS = /[^a-zA-Z0-9._\-]/g;
const LEADING_DOTS_OR_DASHES = /^[.\-]+/;
const MAX_FILENAME_LENGTH = 255;

/**
 * Sanitizes an uploaded filename to prevent path traversal and unsafe characters.
 *
 * Strategy:
 *  1. Strip all directory components (blocks ../../ traversal)
 *  2. Remove null bytes and other control characters
 *  3. Replace any remaining unsafe characters with underscores
 *  4. Strip leading dots/dashes to avoid hidden-file tricks
 *  5. Truncate to filesystem-safe length while preserving extension
 *  6. Fall back to "upload" when nothing safe remains
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'upload';
  }

  // 1. Strip directory traversal: keep only the final path component
  let name = path.basename(filename);

  // 2. Remove null bytes and ASCII control characters (0x00–0x1F, 0x7F)
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1f\x7f]/g, '');

  // 3. Replace unsafe characters with underscores
  name = name.replace(UNSAFE_CHARS, '_');

  // 4. Strip leading dots and dashes
  name = name.replace(LEADING_DOTS_OR_DASHES, '');

  // 5. Truncate to MAX_FILENAME_LENGTH, keeping the extension intact
  if (name.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    const allowedBase = MAX_FILENAME_LENGTH - ext.length;
    name = base.slice(0, allowedBase) + ext;
  }

  // 6. Fallback when sanitization leaves nothing meaningful (empty or all underscores/dashes)
  if (!name || !/[a-zA-Z0-9]/.test(name)) {
    return 'upload';
  }
  return name;
}

module.exports = { sanitizeFilename };
