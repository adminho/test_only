import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, MAX_FILE_SIZE, isPdf, sanitizeFilename, appendMetadata } from '@/lib/uploads';

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart/form-data request' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing or invalid file field' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File exceeds 50 MB limit' }, { status: 413 });
  }

  if (!(await isPdf(file))) {
    return NextResponse.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }

  const { id, storedName } = sanitizeFilename(file.name);

  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), Buffer.from(await file.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: 'Failed to save file to storage' }, { status: 500 });
  }

  try {
    appendMetadata({
      id,
      originalName: file.name,
      storedName,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    });
  } catch {
    // metadata failure is non-fatal; file is already saved
  }

  return NextResponse.json(
    { ok: true, id, originalName: file.name, size: file.size, downloadUrl: `/api/upload/${id}` },
    { status: 200 },
  );
}
