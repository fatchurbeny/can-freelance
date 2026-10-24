import Link from 'next/link';
import { SearchX } from 'lucide-react';
import TopBar from '@/components/TopBar';

export const metadata = {
  title: 'Halaman Tidak Ditemukan | CAN-Freelance',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="404" />
      <main className="md:ml-56 flex min-h-[calc(100vh-56px)] items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md space-y-4 rounded-none border border-[#e5e7eb] bg-white p-8 text-center dark:border-[#272a34] dark:bg-[#16181d]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none border border-[#ff5e1f]/30 bg-[#ff5e1f]/10 text-[#ff5e1f]">
            <SearchX className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#ff5e1f]">404</p>
            <h1 className="text-xl font-bold">Halaman tidak ditemukan</h1>
            <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Halaman yang Anda buka tidak ada atau tidak tersedia di server ini.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center rounded-none bg-[#ff5e1f] text-sm font-bold text-white transition-colors hover:bg-[#ff7038]"
          >
            Kembali ke Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
