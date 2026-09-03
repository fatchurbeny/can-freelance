'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full border border-[#272a34] bg-[#16181d] p-6 rounded-none space-y-4 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto text-xl">
          ⚠️
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-red-400">
          Aplikasi Mengalami Kendala Koneksi / Server Error
        </h2>
        <p className="text-xs text-gray-400 leading-relaxed font-sans">
          {error.message || 'Terjadi kesalahan internal server saat memuat data. Mohon pastikan variabel koneksi database di Vercel telah terpasang dengan benar.'}
        </p>
        {error.digest && (
          <div className="p-2 bg-[#0d0e12] border border-[#272a34] text-[10px] font-mono text-gray-500 rounded-none break-all text-left">
            Digest Code: {error.digest}
          </div>
        )}
        <div className="pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-[#ff5e1f] hover:bg-[#ff7038] text-white text-xs font-bold uppercase tracking-wider transition-colors rounded-none"
          >
            Coba Muat Ulang Halaman
          </button>
        </div>
      </div>
    </div>
  );
}
