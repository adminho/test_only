/**
 * Manual test guide (no test runner wired up yet):
 *
 * Start: npm run dev
 *
 * 1. Upload valid PDF:
 *    curl -F "file=@sample.pdf" -F "uploaded_by=alice" http://localhost:3000/api/upload
 *    → 201 { download_url, file_id, ... }
 *
 * 2. Missing file:
 *    curl -X POST http://localhost:3000/api/upload
 *    → 400 { error: "Missing or invalid file..." }
 *
 * 3. Non-PDF file:
 *    curl -F "file=@photo.jpg" http://localhost:3000/api/upload
 *    → 400 { error: "Missing or invalid file..." }
 *
 * 4. Oversized file (>10 MB):
 *    dd if=/dev/zero bs=1M count=11 | curl -F "file=@-;filename=big.pdf;type=application/pdf" http://localhost:3000/api/upload
 *    → 413 { error: "File too large..." }
 *
 * 5. Download:
 *    curl -OJ http://localhost:3000/api/download/<file_id>
 *    → streams original PDF with original filename header
 *
 * 6. Download unknown ID:
 *    curl http://localhost:3000/api/download/nonexistent-id
 *    → 404 { error: "File not found." }
 */

export {};
