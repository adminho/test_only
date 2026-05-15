'use strict';

const path = require('path');

const FALLBACK_NAME = 'upload';

/**
 * Sanitize a filename to prevent path traversal and remove unsafe characters.
 *
 * Rules applied in order:
 *  1. Decode percent-encoded sequences so encoded traversals (%2e%2e%2f) are caught.
 *  2. Strip any directory components — keep only the basename.
 *  3. Remove characters that are illegal or dangerous on common filesystems
 *     (null bytes, control chars, <>:"/\|?* and the leading dot that would
 *     make the file hidden on Unix).
 *  4. Collapse runs of dots to a single dot to block "..../" tricks after stripping.
 *  5. Trim whitespace and trailing dots (Windows rejects trailing dots/spaces).
 *  6. Fall back to FALLBACK_NAME if nothing safe remains.
 *  7. Preserve the file extension so MIME-type detection stays accurate.
 *
 * @param {string} filename - The original filename from the upload.
 * @returns {string} A safe filename with no directory components.
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string' || filename.length === 0) {
    return FALLBACK_NAME;
  }

  // 1. Decode percent-encoding (handles %2e%2e%2f → ../ etc.)
  let name;
  try {
    name = decodeURIComponent(filename);
  } catch (_) {
    // Malformed percent sequences — use the raw string; unsafe chars will be
    // stripped in step 3 anyway.
    name = filename;
  }

  // 2. Strip directory components.  path.basename handles both / and \ on all
  //    platforms, neutralising ../../, ..\..\ and mixed separators.
  name = path.basename(name);

  // 3. Remove null bytes and ASCII control characters (0x00–0x1f, 0x7f).
  //    Remove characters forbidden on Windows: < > : " / \ | ? *
  //    Remove the leading dot to avoid hidden files.
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1f\x7f<>:"/\\|?*]/g, '');

  // 4. Collapse multiple consecutive dots (catches residual "..." patterns).
  name = name.replace(/\.{2,}/g, '.');

  // 5. Trim whitespace and trailing dots.
  name = name.trim().replace(/\.+$/, '');

  // 6. Fall back if nothing safe remains.
  if (name.length === 0) {
    return FALLBACK_NAME;
  }

  return name;
}

module.exports = { sanitizeFilename, FALLBACK_NAME };
