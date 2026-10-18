'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Palette, Copy, Check } from 'lucide-react';

function PaletteWidget() {
  const searchParams = useSearchParams();
  const rawColors = searchParams.get('colors') || '';
  const title = searchParams.get('title') || 'Color Palette Reference';

  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Normalize colors from CSV or format
  const colors = rawColors
    .split(',')
    .map((c) => c.trim().replace(/^#/, ''))
    .filter((c) => /^[0-9A-Fa-f]{3,8}$/.test(c))
    .map((c) => `#${c.toUpperCase()}`);

  const handleCopySingle = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleCopyAll = () => {
    if (colors.length === 0) return;
    navigator.clipboard.writeText(colors.join(', '));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (colors.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0d0e12] flex items-center justify-center p-6 text-gray-500 font-sans text-xs">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#ff5e1f]" />
          <span>Tidak ada parameter warna yang valid (?colors=1E293B,FF5E1F...)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 dark:bg-[#0d0e12] p-4 sm:p-6 font-sans flex flex-col justify-center">
      <div className="w-full max-w-2xl mx-auto rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] shadow-sm divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-[#ff5e1f] flex items-center justify-center shrink-0">
              <Palette className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                {title}
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                {colors.length} Warna Ekstraksi • Klik untuk salin HEX
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] hover:bg-gray-100 dark:hover:bg-[#20232b] text-[11px] font-bold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer shrink-0"
            title="Salin Seluruh Kode HEX"
          >
            {copiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#ff5e1f]" />
                <span>Salin Semua</span>
              </>
            )}
          </button>
        </div>

        {/* Color Swatches Grid */}
        <div className="p-4 bg-white dark:bg-[#0d0e12]">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {colors.map((hex, index) => {
              const isCopied = copiedHex === hex;
              return (
                <button
                  key={`${hex}-${index}`}
                  type="button"
                  onClick={() => handleCopySingle(hex)}
                  className="group relative flex flex-col rounded-none border border-[#f0f0f0] dark:border-[#272a34] overflow-hidden bg-gray-50/50 dark:bg-[#16181d] hover:border-[#ff5e1f] transition-all cursor-pointer text-left focus:outline-none focus:ring-1 focus:ring-[#ff5e1f]"
                  title={`Klik untuk salin ${hex}`}
                >
                  {/* Swatch Color Preview Block */}
                  <div
                    className="w-full h-20 relative flex items-center justify-center transition-transform group-hover:scale-105 duration-200"
                    style={{ backgroundColor: hex }}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    {isCopied && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Swatch Label Footer */}
                  <div className="p-2 flex items-center justify-between bg-white dark:bg-[#16181d]">
                    <span className="font-bold text-[11px] text-gray-900 dark:text-gray-100 group-hover:text-[#ff5e1f] transition-colors">
                      {hex}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      #{index + 1}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

export default function EmbedPalettePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#0d0e12] flex items-center justify-center font-sans text-xs text-gray-400">
          Memuat Palet Warna...
        </div>
      }
    >
      <PaletteWidget />
    </Suspense>
  );
}
