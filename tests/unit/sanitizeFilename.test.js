const { sanitizeFilename } = require('../../src/utils/sanitizeFilename');

describe('sanitizeFilename (Unit)', () => {
  // TC-005 — safe filenames pass through unchanged
  test('preserves safe alphanumeric filenames', () => {
    expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
  });

  test('preserves hyphens and underscores', () => {
    expect(sanitizeFilename('my-report_v2.pdf')).toBe('my-report_v2.pdf');
  });

  // TC-005 — spaces
  test('replaces spaces with underscores', () => {
    expect(sanitizeFilename('annual report 2024.pdf')).toBe('annual_report_2024.pdf');
  });

  // TC-005 — path traversal via forward slashes
  test('strips forward slashes (path traversal prevention)', () => {
    const result = sanitizeFilename('../../../etc/passwd.pdf');
    expect(result).not.toContain('/');
    expect(result).not.toContain('..');
    expect(result).not.toMatch(/^\./); // must not start with a dot
  });

  // TC-005 — path traversal via backslashes (Windows-style)
  test('strips backslashes (Windows path traversal prevention)', () => {
    const result = sanitizeFilename('..\\..\\windows\\system32\\file.pdf');
    expect(result).not.toContain('\\');
    expect(result).not.toContain('..');
    expect(result).not.toMatch(/^\./);
  });

  // TC-005 — shell / HTML injection characters
  test('replaces angle brackets used in script injection', () => {
    expect(sanitizeFilename('file<script>.pdf')).toBe('file_script_.pdf');
  });

  test('replaces semicolons and spaces used in shell injection', () => {
    // Semicolons and spaces are unsafe; hyphens are allowed per the safe-char set.
    expect(sanitizeFilename('file;rm -rf.pdf')).toBe('file_rm_-rf.pdf');
  });

  test('replaces dollar signs and parentheses', () => {
    expect(sanitizeFilename('$(whoami).pdf')).toBe('__whoami_.pdf');
  });

  // TC-005 — double-dot collapsing
  test('collapses consecutive dots', () => {
    expect(sanitizeFilename('file..name.pdf')).toBe('file.name.pdf');
    expect(sanitizeFilename('file...name.pdf')).toBe('file.name.pdf');
  });

  // TC-005 — leading dot / dash
  test('does not produce a filename starting with a dot', () => {
    const result = sanitizeFilename('.hidden.pdf');
    expect(result).not.toMatch(/^\./);
  });

  test('does not produce a filename starting with a dash', () => {
    const result = sanitizeFilename('-badstart.pdf');
    expect(result).not.toMatch(/^-/);
  });

  // Result is always a non-empty string
  test('always returns a non-empty string', () => {
    const result = sanitizeFilename('...///...');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
