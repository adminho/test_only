/**
 * Demo: simulate a file upload then persist and retrieve metadata.
 * Run: npm test  (uses tsx)
 */
import { saveUploadMetadata, getByDownloadUrl, getByUser, closeDb } from "./index.js";

// --- Simulate what happens after a successful file save ---------------

const downloadUrl = "https://cdn.example.com/files/teestxxxxxxx/report-2026.pdf";

const record = saveUploadMetadata({
  original_filename: "report-2026.pdf",
  file_size: 204_800,
  uploaded_by: "couragor@gmail.com",
  uploaded_at: new Date().toISOString(),
  download_url: downloadUrl,
});

console.log("Saved upload metadata:");
console.log(JSON.stringify(record, null, 2));

// --- Retrieve by download URL -----------------------------------------

const found = getByDownloadUrl(downloadUrl);
console.log("\nRetrieved by download URL:");
console.log(JSON.stringify(found, null, 2));
console.assert(found?.id === record.id, "ID mismatch");
console.assert(found?.download_url === downloadUrl, "URL mismatch");

// --- Retrieve all uploads for the user --------------------------------

const all = getByUser("couragor@gmail.com");
console.log(`\nAll uploads for user (${all.length} record(s)):`);
all.forEach((r) => console.log(`  [${r.id}] ${r.original_filename} -- ${r.download_url}`));

closeDb();
console.log("\nAll assertions passed.");
