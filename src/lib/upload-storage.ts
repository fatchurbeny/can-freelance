import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** Ekstensi yang dilayani /api/uploads/[filename]. */
export const SERVABLE_UPLOAD_EXTENSIONS = ['webp', 'png', 'jpg', 'jpeg'] as const;

/** Simpan file ke public/uploads dengan nama unik; mengembalikan nama file. */
export function saveUploadedFile(buffer: Buffer, ext: string = 'webp'): string {
  const safeExt = (SERVABLE_UPLOAD_EXTENSIONS as readonly string[]).includes(ext) ? ext : 'webp';
  const filename = `ref-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${safeExt}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  fs.writeFileSync(path.join(uploadDir, filename), buffer);
  return filename;
}
