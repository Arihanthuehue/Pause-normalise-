import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    const type = searchParams.get('type'); // 'uploads' or 'outputs'

    if (!filename || !type || (type !== 'uploads' && type !== 'outputs')) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Safety check against path traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), type, safeFilename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = 'audio/mpeg';
    if (ext === '.wav') contentType = 'audio/wav';
    if (ext === '.m4a') contentType = 'audio/x-m4a';

    const fileStream = fs.createReadStream(filePath);
    const stat = fs.statSync(filePath);

    return new NextResponse(fileStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
