'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeFilename, FALLBACK_NAME } = require('../src/utils/sanitizeFilename');

// TC-005 — path traversal prevention
test('TC-005: strips leading ../ path traversal', () => {
  assert.equal(sanitizeFilename('../../test.pdf'), 'test.pdf');
});

test('TC-005: strips deep relative path traversal', () => {
  assert.equal(sanitizeFilename('../../../etc/passwd'), 'passwd');
});

test('TC-005: strips Windows-style path traversal', () => {
  assert.equal(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
});

test('TC-005: strips absolute Unix path', () => {
  assert.equal(sanitizeFilename('/etc/shadow'), 'shadow');
});

test('TC-005: strips absolute Windows path', () => {
  assert.equal(sanitizeFilename('C:\\Users\\secret\\file.txt'), 'file.txt');
});

test('TC-005: strips percent-encoded traversal (%2e%2e%2f)', () => {
  assert.equal(sanitizeFilename('%2e%2e%2ftest.pdf'), 'test.pdf');
});

test('TC-005: strips double-percent-encoded traversal', () => {
  assert.equal(sanitizeFilename('..%2f..%2fetc%2fpasswd'), 'passwd');
});

// Normal filenames must pass through unchanged
test('preserves a clean filename', () => {
  assert.equal(sanitizeFilename('report.pdf'), 'report.pdf');
});

test('preserves filename with underscores and hyphens', () => {
  assert.equal(sanitizeFilename('my_report-2024.docx'), 'my_report-2024.docx');
});

test('preserves filename with spaces', () => {
  assert.equal(sanitizeFilename('my report.pdf'), 'my report.pdf');
});

// Dangerous characters are stripped
test('removes null bytes', () => {
  const name = 'evil\x00.txt';
  const result = sanitizeFilename(name);
  assert.ok(!result.includes('\x00'));
});

test('removes angle brackets and colons', () => {
  assert.ok(!sanitizeFilename('file<name>:bad.txt').includes('<'));
  assert.ok(!sanitizeFilename('file<name>:bad.txt').includes('>'));
  assert.ok(!sanitizeFilename('file<name>:bad.txt').includes(':'));
});

test('collapses multiple dots', () => {
  const result = sanitizeFilename('test...file.txt');
  assert.ok(!result.includes('..'));
});

// Edge cases
test('returns fallback for empty string', () => {
  assert.equal(sanitizeFilename(''), FALLBACK_NAME);
});

test('returns fallback for non-string input', () => {
  assert.equal(sanitizeFilename(null), FALLBACK_NAME);
  assert.equal(sanitizeFilename(undefined), FALLBACK_NAME);
  assert.equal(sanitizeFilename(42), FALLBACK_NAME);
});

test('returns fallback when only unsafe characters remain', () => {
  assert.equal(sanitizeFilename('<>:"/\\|?*'), FALLBACK_NAME);
});

test('returns fallback for filename that is only dots', () => {
  assert.equal(sanitizeFilename('....'), FALLBACK_NAME);
});

test('strips trailing dots (Windows incompatibility)', () => {
  const result = sanitizeFilename('file.');
  assert.ok(!result.endsWith('.'));
});
