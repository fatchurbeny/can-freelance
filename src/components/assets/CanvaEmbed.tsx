"use client";

import { useState } from 'react';
import { ExternalLink, ImageOff } from 'lucide-react';
import { toCanvaEmbedUrl } from '@/lib/canva-url';

interface Props {
  previewUrl: string;
  title: string;
  className?: string;
}

/** Preview Canva tanpa login: iframe public view link `?embed`, rasio 16:9. */
export default function CanvaEmbed({ previewUrl, title, className = '' }: Props) {
  const embedUrl = toCanvaEmbedUrl(previewUrl);
  const [loaded, setLoaded] = useState(false);

  if (!embedUrl) {
    return (
      <div className={`flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gray-50 text-center text-xs text-gray-500 dark:bg-[#16181d] dark:text-gray-400 ${className}`}>
        <ImageOff className="h-5 w-5" />
        <span className="font-bold">Preview tidak tersedia</span>
        <span className="max-w-[260px]">Public view link belum valid. Perbaiki di Edit Aset.</span>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full overflow-hidden bg-[#1f2026] ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-400">Memuat preview Canva…</div>
      )}
      <iframe
        src={embedUrl}
        title={`Preview Canva: ${title}`}
        loading="lazy"
        allow="fullscreen"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full border-0"
      />
      <a
        href={previewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute right-2 top-2 flex items-center gap-1 bg-black/60 px-2 py-1 text-[11px] font-bold text-white hover:bg-black/80"
      >
        Tab baru <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
