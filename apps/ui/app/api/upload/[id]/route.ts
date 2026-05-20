import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { UPLOAD_DIR, findById } from '@/lib/uploads';

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const record = findById(id);
  if (record === undefined) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, record.storedName);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const encodedName = encodeURIComponent(record.originalName);
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodedName}`,
      'Content-Length': String(buffer.length),
    },
  });
}
