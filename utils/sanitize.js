'use strict';

const path = require('path');

/**
 * Sanitizes an uploaded filename to prevent path traversal and remove unsafe characters.
 *
 * Steps:
 *   1. Extract only the basename (drops any directory components like ../../)
 *   2. Strip or replace characters that are unsafe in filenames on common OSes
 *      (<, >, :, ", /, \, |, ?, *, null bytes, and control characters)
 *   3. Collapse runs of dots or hyphens used to disguise traversal (e.g. "...pdf")
 *   4. Fall back to "upload" if the sanitized stem turns out empty
 *   5. Preserve the .pdf extension (lower-cased)
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'upload.pdf';
  }

  // 1. Take only the basename — removes any ../ or ..\ prefix
  let name = path.basename(filename);

  // 2. Remove null bytes and ASCII control characters
  name = name.replace(/[\x00-\x1f\x7f]/g, '');

  // 3. Remove characters unsafe in Windows/Linux filenames
  name = name.replace(/[<>:"/\\|?*]/g, '');

  // 4. Remove leading dots and hyphens (hidden-file or disguised-traversal patterns)
  name = name.replace(/^[.\-]+/, '');

  // 5. Collapse consecutive dots (e.g. "..pdf" → "pdf")
  name = name.replace(/\.{2,}/g, '.');

  // 6. Split off extension for independent cleaning
  const ext = path.extname(name).toLowerCase();   // e.g. ".pdf"
  let stem = path.basename(name, ext);            // everything before the last dot

  // 7. Remove any remaining dots/spaces from stem edges
  stem = stem.replace(/^[.\s]+|[.\s]+$/g, '');

  // 8. Fall back to "upload" if stem is empty after sanitization
  if (!stem) {
    stem = 'upload';
  }

  // 9. Re-attach extension (only .pdf is accepted by the upload route, but
  //    we sanitize independently so the check remains in the route layer)
  const safeExt = ext || '.pdf';
  return `${stem}${safeExt}`;
}

module.exports = { sanitizeFilename };
