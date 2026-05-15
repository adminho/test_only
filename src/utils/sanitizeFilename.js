/**
 * Strips path separators and unsafe characters from a filename.
 * Prevents path traversal and shell-injection risks in saved names.
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[/\\]/g, '_')           // neutralize path separators first
    .replace(/[^a-zA-Z0-9._-]/g, '_') // replace remaining unsafe chars
    .replace(/\.{2,}/g, '.')           // collapse consecutive dots
    .replace(/^[.-]/, '_');            // forbid leading dot or dash
}

module.exports = { sanitizeFilename };
