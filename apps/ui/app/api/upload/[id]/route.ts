import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { UPLOAD_DIR, findById } from '@/lib/uploads';

export const runtime = 'nodejs';

type Params = Promise<{ id: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params },
): Promise<NextResponse> {
  const { id } = await params;

  const entry = findById(id);
  if (entry === undefined) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, entry.storedName);
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
  }

  // RFC 5987 encoded filename for non-ASCII safety
  const encodedName = encodeURIComponent(entry.originalName).replace(/'/g, '%27');
  const disposition = `attachment; filename*=UTF-8''${encodedName}`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': disposition,
      'Content-Length': String(buffer.length),
    },
  });
}
