"use client";

import { useMemo } from 'react';
import { FEATURE_MATRIX, ROLE_LABELS, ROLE_PERMISSIONS, type FeatureLevel, type RoleKey } from '@/lib/permissions';

const COLUMNS: RoleKey[] = ['admin', 'art_director', 'project_manager', 'finance', 'designer_fulltime', 'designer_freelance', 'viewer'];
const SHORT: Record<RoleKey, string> = {
  admin: 'ADMIN',
  art_director: 'ART DIR.',
  project_manager: 'PROJ. MGR',
  finance: 'FINANCE',
  designer_fulltime: 'DESIGNER FT',
  designer_freelance: 'DESIGNER FL',
  viewer: 'VIEWER',
};
const SYMBOL: Record<FeatureLevel, string> = { full: '●', limited: '◐', none: '–' };

/** Matriks menu & fitur per role (baca-saja), dihitung dari ROLE_PERMISSIONS. */
export default function PermissionMatrix() {
  const rows = useMemo(
    () =>
      FEATURE_MATRIX.map((row) => ({
        label: row.label,
        cells: COLUMNS.map((role) => row.level(role, new Set(ROLE_PERMISSIONS[role]))),
      })),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Menu dan fitur yang terlihat per role. Sumber: kode (<code className="font-mono">permissions.ts</code>), bukan data manual.</span>
        <span>● penuh · ◐ terbatas (baca saja / milik sendiri) · – tidak tampil</span>
      </div>
      <div className="overflow-x-auto rounded-none border border-[#f0f0f0] bg-white dark:border-[#272a34] dark:bg-[#0d0e12]">
        <table className="w-full min-w-[820px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#f0f0f0] bg-gray-50/60 text-[11px] font-semibold tracking-wide text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-400">
              <th className="px-4 py-3 text-left">MENU / FITUR</th>
              {COLUMNS.map((role) => (
                <th key={role} className="px-2 py-3 text-center" title={ROLE_LABELS[role]}>{SHORT[role]}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                {row.cells.map((level, i) => (
                  <td
                    key={COLUMNS[i]}
                    className={`px-2 py-3 text-center text-base ${level === 'none' ? 'text-gray-300 dark:text-gray-600' : level === 'limited' ? 'text-amber-500' : 'text-[#ff5e1f]'}`}
                    aria-label={`${ROLE_LABELS[COLUMNS[i]]}: ${level === 'full' ? 'penuh' : level === 'limited' ? 'terbatas' : 'tidak tampil'}`}
                  >
                    {SYMBOL[level]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-gray-400">
        Designer tidak punya Overview (landing = Kanban production yang diizinkan). Design Brief hanya-baca untuk designer. Brand/Akun Canva disembunyikan dari Designer FL dan Viewer.
        Billing designer = milik sendiri.
      </p>
    </div>
  );
}
