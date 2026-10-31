import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * Sengaja publik (tanpa authorizeApi): URL gambar referensi ditanam di body Notion dan diambil
 * Notion tanpa cookie sesi. Nama file acak (`ref-<ts>-<hex>.webp`, lihat api/upload) dan
 * hanya tipe gambar raster yang dilayani.
 */
const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export async function GET(
  request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const contentType = CONTENT_TYPES[path.extname(safeFilename).toLowerCase()];
    if (!contentType) {
      return new NextResponse('File not found', { status: 404 });
    }
    
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

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('Error serving upload:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
