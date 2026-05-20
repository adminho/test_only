import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import {
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  sanitizeFilename,
  isPdf,
  appendMetadata,
} from '@/lib/uploads';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024} MB` },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!isPdf(file, buffer)) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }

  // Ensure upload directory exists (outside public web root)
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create upload directory', err);
    return NextResponse.json({ error: 'Storage failure' }, { status: 500 });
  }

  const id = crypto.randomUUID();
  const storedName = sanitizeFilename(file.name);
  const filePath = path.join(UPLOAD_DIR, storedName);

  try {
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error('Failed to write uploaded file', err);
    return NextResponse.json({ error: 'Storage failure' }, { status: 500 });
  }

  try {
    appendMetadata({
      id,
      originalName: file.name,
      storedName,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch (err) {
    // Metadata write failed — clean up the stored file to avoid orphans
    try {
      fs.unlinkSync(filePath);
    } catch {
      // best-effort cleanup
    }
    console.error('Failed to persist upload metadata', err);
    return NextResponse.json({ error: 'Storage failure' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id,
    originalName: file.name,
    size: file.size,
    downloadUrl: `/api/upload/${id}`,
  });
}
