'use client';

import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { toServableImage } from './brief-parser';

interface Props {
  /** URL gambar yang sudah ada di section Reference Image. */
  images: string[];
  onAdd: (urls: string[]) => void;
  onRemove: (url: string) => void;
}

const MAX_PER_BATCH = 10;

async function uploadOne(file: File): Promise<string | null> {
  const { compressImageToWebP } = await import('@/lib/color-extractor');
  // Thumbnail deck berisi teks kecil; 1400px masih jauh di bawah batas 2 MB route upload
  const blob = await compressImageToWebP(file, 1400, 1400, 0.85);
  const form = new FormData();
  form.append('file', blob, 'reference.webp');
  const res = await fetch('/can-freelance/api/upload', { method: 'POST', body: form });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.url ?? null;
}

/**
 * Upload banyak gambar referensi gaya sekaligus (pilih file, drag & drop, atau paste).
 * Terpisah dari picker palet: palet tetap diambil dari satu sumber.
 */
export default function ReferenceImageUploader({ images, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(0);

  const handleFiles = async (list: File[]) => {
    const files = list.filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      toast.error('File harus berupa gambar (PNG, JPG, WebP)');
      return;
    }
    const batch = files.slice(0, MAX_PER_BATCH);
    if (files.length > MAX_PER_BATCH) toast(`Hanya ${MAX_PER_BATCH} gambar pertama yang diunggah`);
    setPending((n) => n + batch.length);
    const results = await Promise.all(
      batch.map((f) =>
        uploadOne(f)
          .catch(() => null)
          .finally(() => setPending((n) => n - 1))
      )
    );
    const urls = results.filter((u): u is string => !!u);
    if (urls.length) {
      onAdd(urls);
      toast.success(`${urls.length} gambar referensi ditambahkan`);
    }
    if (urls.length < batch.length) toast.error(`${batch.length - urls.length} gambar gagal diunggah`);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(Array.from(e.dataTransfer.files || []));
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const files = Array.from(e.clipboardData?.items || [])
      .filter((it) => it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => !!f);
    if (files.length === 0) return;
    // preventDefault juga menandai event agar listener paste global picker palet mengabaikannya
    e.preventDefault();
    handleFiles(files);
  };

  return (
    <div className="mt-2 space-y-2 font-sans">
      {(images.length > 0 || pending > 0) && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url) => (
            <div key={url} className="group relative aspect-video border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50 dark:bg-[#16181d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={toServableImage(url)} alt="Reference" loading="lazy" className="size-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(url)}
                aria-label="Hapus gambar referensi"
                className="absolute right-1 top-1 flex size-6 items-center justify-center bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: pending }).map((_, i) => (
            <div key={`p${i}`} className="flex aspect-video items-center justify-center border border-dashed border-[#f0f0f0] dark:border-[#272a34] text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(Array.from(e.target.files || []));
          e.target.value = '';
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onPaste={onPaste}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer items-center justify-center gap-2 border border-dashed px-3 py-3 text-[11px] outline-none transition-colors focus:border-[#ff5e1f] ${
          dragging
            ? 'border-[#ff5e1f] bg-[#ff5e1f]/5 text-[#ff5e1f]'
            : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-500 dark:text-gray-400 hover:border-[#ff5e1f] hover:text-[#ff5e1f]'
        }`}
      >
        <ImagePlus className="w-3.5 h-3.5 shrink-0" />
        <span>
          <span className="font-bold">Tambah gambar referensi</span> · bisa beberapa sekaligus (pilih, drag &amp; drop, atau klik lalu Paste)
        </span>
      </div>
    </div>
  );
}
