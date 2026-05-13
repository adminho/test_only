const { Router } = require('express');
const upload = require('../middleware/upload');
const validatePdfMagicBytes = require('../middleware/validatePdf');
const { uploadPdf, getUploadInfo, downloadUpload, listAllUploads } = require('../controllers/uploadsController');

const router = Router();

// POST /api/uploads — upload a PDF
router.post('/', upload.single('file'), validatePdfMagicBytes, uploadPdf);

// GET /api/uploads — list all uploads
router.get('/', listAllUploads);

// GET /api/uploads/:id — get upload metadata
router.get('/:id', getUploadInfo);

// GET /api/uploads/:id/download — download the PDF
router.get('/:id/download', downloadUpload);

module.exports = router;
