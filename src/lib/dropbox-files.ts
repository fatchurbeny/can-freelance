/**
 * Isi folder Dropbox task (snapshot `Task.dropboxFiles`) → format deliverable (dipakai client & server).
 * Spec: design-handoff/IMPLEMENTATION-slide-master-builder.md §5.0 (F2).
 */

export interface DropboxFileInfo {
  name: string;
  size: number;
  modified: string;
}

export interface DropboxSnapshot {
  files: DropboxFileInfo[];
}

export type FileKind = 'pptx' | 'ppt' | 'key' | 'pdf' | 'image' | 'zip' | 'other';

const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

export function fileKind(name: string): FileKind {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  if (ext === 'pptx' || ext === 'ppt' || ext === 'key' || ext === 'pdf' || ext === 'zip') return ext;
  if (IMAGE_EXT.has(ext)) return 'image';
  return 'other';
}

/** Item Checklist QA yang bisa dibuktikan oleh file (Master Slides tidak: dicentang job/QA). */
const ITEM_KIND: Record<string, FileKind> = {
  preview: 'image',
  keynote: 'key',
  key: 'key',
  ppt: 'ppt',
  pptx: 'pptx',
  pdf: 'pdf',
};

export function itemFileKind(label: string): FileKind | null {
  return ITEM_KIND[label.trim().toLowerCase()] ?? null;
}

/** Snapshot dari kolom Json (bentuk lama/kosong → null). */
export function readSnapshot(value: unknown): DropboxSnapshot | null {
  const files = (value as DropboxSnapshot | null)?.files;
  return Array.isArray(files) ? { files } : null;
}

/** Label item Checklist QA yang file-nya ada di folder. */
export function itemsFoundInFiles(required: readonly string[], files: readonly DropboxFileInfo[]): string[] {
  const kinds = new Set(files.map((f) => fileKind(f.name)));
  return required.filter((label) => {
    const kind = itemFileKind(label);
    return !!kind && kinds.has(kind);
  });
}

/** Alasan task masih menunggu file (PDF wajib untuk analisis slide master; .zip tidak dihitung). */
export function waitingFileReasons(files: readonly DropboxFileInfo[]): string[] {
  const kinds = files.map((f) => fileKind(f.name));
  const reasons: string[] = [];
  if (!kinds.includes('pdf')) reasons.push('PDF belum ada');
  if (kinds.includes('zip')) reasons.push('Ada file .zip (unggah file satuan)');
  return reasons;
}
