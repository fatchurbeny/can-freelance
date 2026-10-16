import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    
    // Check in storage/uploads or public/uploads
    const pathsToTry = [
      path.join(process.cwd(), 'storage', 'uploads', safeFilename),
      path.join(process.cwd(), 'public', 'uploads', safeFilename),
    ];

    let targetPath = '';
    for (const p of pathsToTry) {
      if (fs.existsSync(p)) {
        targetPath = p;
        break;
      }
    }

    if (!targetPath) {
      return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const ext = path.extname(safeFilename).toLowerCase();
    
    let contentType = 'image/webp';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving upload:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
