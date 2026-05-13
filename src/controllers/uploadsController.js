const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { insertUpload, findById, listUploads } = require('../models/upload');
const config = require('../config');

function buildDownloadUrl(req, id) {
  const base = config.baseUrl || `${req.protocol}://${req.get('host')}`;
  return `${base}/api/uploads/${id}/download`;
}

function formatRecord(record, req) {
  return {
    id: record.id,
    original_name: record.original_name,
    size: record.size,
    mime_type: record.mime_type,
    created_at: record.created_at,
    download_url: buildDownloadUrl(req, record.id),
  };
}

async function uploadPdf(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided. Send a PDF via the "file" field.' });
  }

  const id = uuidv4();
  const stored_name = path.basename(req.file.path);

  // Rename the multer-generated file to use our own stable ID-based name
  const finalPath = path.join(config.uploadDir, `${id}.pdf`);
  fs.renameSync(req.file.path, finalPath);

  const record = insertUpload({
    id,
    original_name: req.file.originalname,
    stored_name: `${id}.pdf`,
    file_path: finalPath,
    size: req.file.size,
    mime_type: req.file.mimetype,
  });

  return res.status(201).json(formatRecord(record, req));
}

async function getUploadInfo(req, res) {
  const record = findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Upload not found' });
  return res.json(formatRecord(record, req));
}

async function downloadUpload(req, res) {
  const record = findById(req.params.id);
  if (!record) return res.status(404).json({ error: 'Upload not found' });

  if (!fs.existsSync(record.file_path)) {
    return res.status(404).json({ error: 'File not found on storage' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${record.original_name}"`);
  res.setHeader('Content-Length', record.size);
  fs.createReadStream(record.file_path).pipe(res);
}

async function listAllUploads(req, res) {
  const records = listUploads();
  return res.json(records.map((r) => formatRecord(r, req)));
}

module.exports = { uploadPdf, getUploadInfo, downloadUpload, listAllUploads };
