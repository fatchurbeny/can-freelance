"use client";

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import type { AccessInfo } from '@/lib/permissions';

const NO_SIDEBAR_PREFIXES = ['/embed', '/content-access', '/login', '/change-pin'];

/** Sidebar tunggal di root layout agar state & daftar production tidak dibuat ulang tiap navigasi. */
export default function AppSidebar({ access }: { access: AccessInfo }) {
  const pathname = usePathname();
  if (NO_SIDEBAR_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return (
    <Suspense fallback={null}>
      <Sidebar currentSyncLog={null} access={access} />
    </Suspense>
  );
}
