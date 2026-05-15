const { sanitizeFilename } = require('../src/sanitizeFilename');

describe('sanitizeFilename', () => {
  // TC-005: Path traversal prevention
  describe('path traversal prevention', () => {
    test('strips unix-style traversal sequences', () => {
      expect(sanitizeFilename('../../test.pdf')).toBe('test.pdf');
    });

    test('strips windows-style traversal sequences', () => {
      expect(sanitizeFilename('..\\..\\test.pdf')).toBe('test.pdf');
    });

    test('strips absolute unix path', () => {
      expect(sanitizeFilename('/etc/passwd')).toBe('passwd');
    });

    test('strips absolute windows path', () => {
      expect(sanitizeFilename('C:\\Windows\\System32\\cmd.exe')).toBe('cmd.exe');
    });

    test('strips nested directory path', () => {
      expect(sanitizeFilename('uploads/subdir/report.csv')).toBe('report.csv');
    });
  });

  // Safe characters preserved
  describe('safe filenames are preserved', () => {
    test('plain filename with extension', () => {
      expect(sanitizeFilename('document.pdf')).toBe('document.pdf');
    });

    test('filename with hyphens and underscores', () => {
      expect(sanitizeFilename('my-file_v2.txt')).toBe('my-file_v2.txt');
    });

    test('filename with digits', () => {
      expect(sanitizeFilename('report2024.xlsx')).toBe('report2024.xlsx');
    });

    test('uppercase letters', () => {
      expect(sanitizeFilename('README.MD')).toBe('README.MD');
    });
  });

  // Unsafe character replacement
  describe('unsafe character replacement', () => {
    test('replaces spaces with underscores', () => {
      expect(sanitizeFilename('my document.pdf')).toBe('my_document.pdf');
    });

    test('replaces special shell characters', () => {
      expect(sanitizeFilename('file;rm -rf.sh')).toBe('file_rm_-rf.sh');
    });

    test('replaces null bytes', () => {
      expect(sanitizeFilename('file\x00name.txt')).toBe('filename.txt');
    });

    test('replaces control characters', () => {
      expect(sanitizeFilename('file\x01\x1fname.txt')).toBe('filename.txt');
    });

    test('replaces angle brackets and quotes', () => {
      expect(sanitizeFilename('<script>alert.js')).toBe('_script_alert.js');
    });
  });

  // Leading dot / hidden file prevention
  describe('leading dot stripping', () => {
    test('strips leading dot from hidden file', () => {
      expect(sanitizeFilename('.htaccess')).toBe('htaccess');
    });

    test('strips multiple leading dots', () => {
      expect(sanitizeFilename('...config')).toBe('config');
    });

    test('strips leading dash', () => {
      expect(sanitizeFilename('-important.txt')).toBe('important.txt');
    });
  });

  // Edge cases
  describe('edge cases', () => {
    test('empty string returns fallback', () => {
      expect(sanitizeFilename('')).toBe('upload');
    });

    test('null returns fallback', () => {
      expect(sanitizeFilename(null)).toBe('upload');
    });

    test('undefined returns fallback', () => {
      expect(sanitizeFilename(undefined)).toBe('upload');
    });

    test('only unsafe characters returns fallback', () => {
      expect(sanitizeFilename('????')).toBe('upload');
    });

    test('only dots returns fallback', () => {
      expect(sanitizeFilename('...')).toBe('upload');
    });

    test('truncates very long filename while preserving extension', () => {
      const longBase = 'a'.repeat(300);
      const result = sanitizeFilename(longBase + '.pdf');
      expect(result.length).toBeLessThanOrEqual(255);
      expect(result.endsWith('.pdf')).toBe(true);
    });
  });
});
