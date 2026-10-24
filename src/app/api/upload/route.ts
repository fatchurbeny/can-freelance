import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/api-auth';
import { saveUploadedFile } from '@/lib/upload-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const denied = await authorizeApi(['task.edit', 'asset.manage'], { write: true });
  if (denied) return denied;
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Limit maximum upload size to 2MB (compressed client-side WebP is normally ~50-90KB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 2MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const filename = saveUploadedFile(buffer);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.fatchurbeny.com/can-freelance';
    const publicUrl = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
      ? 'https://portal.fatchurbeny.com/can-freelance'
      : baseUrl.replace(/\/$/, '');

    const fileUrl = `${publicUrl}/api/uploads/${filename}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      size: buffer.length,
      filename,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
  }
}
