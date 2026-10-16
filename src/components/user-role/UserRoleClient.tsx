"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, X } from 'lucide-react';
import SelectDropdown from '@/components/SelectDropdown';
import PermissionMatrix from './PermissionMatrix';
import UserDrawer from './UserDrawer';
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from '@/lib/permissions';
import type { UserRow } from '@/lib/user-admin';

export interface UnitOption { id: string; name: string }
export interface FreeDesigner { id: string; displayName: string; contractType: string | null }

interface Props {
  initialUsers: UserRow[];
  units: UnitOption[];
  freeDesigners: FreeDesigner[];
  meId: string;
}

function statusOf(u: UserRow): { label: string; className: string; key: string } {
  if (!u.isActive) return { key: 'inactive', label: 'Nonaktif', className: 'text-gray-400' };
  if (u.locked) return { key: 'locked', label: 'Terkunci', className: 'text-rose-500' };
  if (u.pinMustChange) return { key: 'pin', label: 'Wajib ganti PIN', className: 'text-amber-600 dark:text-amber-400' };
  return { key: 'active', label: 'Aktif', className: 'text-emerald-600 dark:text-emerald-400' };
}

function accessSummary(u: UserRow, units: UnitOption[]): string {
  const name = (id: string | null) => (id === null ? 'Semua production' : units.find((x) => x.id === id)?.name ?? '?');
  const byRole = new Map<string, string[]>();
  for (const m of u.memberships) byRole.set(m.roleKey, [...(byRole.get(m.roleKey) ?? []), name(m.productionUnitId)]);
  return Array.from(byRole.entries())
    .map(([role, names]) => `${ROLE_LABELS[role as RoleKey] ?? role} · ${names.join(', ')}`)
    .join(' | ');
}

const cell = 'h-11 rounded-none border-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-xs';

export default function UserRoleClient({ initialUsers, units, freeDesigners, meId }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'matrix'>('users');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [type, setType] = useState('all');
  const [unit, setUnit] = useState('all');
  const [status, setStatus] = useState('all');
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; userId: string | null } | null>(null);
  // Diturunkan dari props agar status/akses terbaru tampil setelah router.refresh().
  const drawerUser = drawer?.userId ? initialUsers.find((u) => u.id === drawer.userId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialUsers.filter((u) => {
      if (q && !`${u.userCode} ${u.name ?? ''}`.toLowerCase().includes(q)) return false;
      if (role !== 'all' && !u.memberships.some((m) => m.roleKey === role)) return false;
      if (type !== 'all' && u.employmentType !== type) return false;
      if (unit !== 'all' && !u.memberships.some((m) => m.productionUnitId === null || m.productionUnitId === unit)) return false;
      if (status !== 'all' && statusOf(u).key !== status) return false;
      return true;
    });
  }, [initialUsers, search, role, type, unit, status]);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col rounded-none border border-[#f0f0f0] bg-white font-sans dark:border-[#272a34] dark:bg-[#0d0e12]">
      <div className="flex items-stretch border-b border-[#f0f0f0] dark:border-[#272a34]">
        {([['users', `Daftar User (${initialUsers.length})`], ['matrix', 'Matriks Hak Akses']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative px-5 py-3 text-sm cursor-pointer border-r border-[#f0f0f0] dark:border-[#272a34] ${tab === id ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'}`}
          >
            {label}
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ff5e1f]" />}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'users' && (
          <button
            type="button"
            onClick={() => setDrawer({ mode: 'create', userId: null })}
            className="flex items-center gap-1.5 bg-[#ff5e1f] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah User</span>
          </button>
        )}
      </div>

      {tab === 'matrix' ? (
        <div className="p-4"><PermissionMatrix /></div>
      ) : (
        <>
          <div className="flex flex-wrap items-stretch border-b border-[#f0f0f0] dark:border-[#272a34]">
            <label className="flex h-11 min-w-[200px] flex-1 items-center gap-2 border-r border-[#f0f0f0] px-3.5 dark:border-[#272a34]">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari ID atau nama…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
                aria-label="Cari user"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian" className="cursor-pointer text-gray-400 hover:text-[#ff5e1f]">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>
            <div className="w-[170px]"><SelectDropdown label="Role" value={role} onChange={setRole} buttonClassName={cell}
              options={[{ value: 'all', label: 'ALL Role' }, ...ROLE_KEYS.map((r) => ({ value: r, label: ROLE_LABELS[r] }))]} /></div>
            <div className="w-[140px]"><SelectDropdown label="Tipe" value={type} onChange={setType} buttonClassName={cell}
              options={[{ value: 'all', label: 'ALL Tipe' }, { value: 'FULL_TIME', label: 'Full-time' }, { value: 'FREELANCE', label: 'Freelance' }]} /></div>
            <div className="w-[190px]"><SelectDropdown label="Production" value={unit} onChange={setUnit} buttonClassName={cell}
              options={[{ value: 'all', label: 'ALL Production' }, ...units.map((u) => ({ value: u.id, label: u.name }))]} /></div>
            <div className="w-[170px]"><SelectDropdown label="Status" value={status} onChange={setStatus} buttonClassName={`${cell} border-r-0`}
              options={[{ value: 'all', label: 'ALL Status' }, { value: 'active', label: 'Aktif' }, { value: 'pin', label: 'Wajib ganti PIN' }, { value: 'locked', label: 'Terkunci' }, { value: 'inactive', label: 'Nonaktif' }]} /></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#f0f0f0] bg-gray-50/60 text-[11px] font-semibold tracking-wide text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-400">
                  {['ID', 'NAMA', 'TIPE', 'ROLE · PRODUCTION', 'STATUS', 'LOGIN TERAKHIR'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                {filtered.map((u) => {
                  const st = statusOf(u);
                  return (
                    <tr key={u.id} onClick={() => setDrawer({ mode: 'edit', userId: u.id })} className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#16181d]">
                      <td className="px-4 py-3 font-mono font-bold">{u.userCode}{u.id === meId && <span className="ml-2 font-sans text-[10px] text-gray-400">(saya)</span>}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{u.name || '—'}{u.designerName && <span className="ml-2 text-[10px] font-normal text-gray-400">profil: {u.designerName}</span>}</td>
                      <td className="px-4 py-3">{u.employmentType === 'FULL_TIME' ? 'Full-time' : u.employmentType === 'FREELANCE' ? 'Freelance' : '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{accessSummary(u, units) || '—'}</td>
                      <td className={`px-4 py-3 font-bold ${st.className}`}>{st.label}</td>
                      <td className="px-4 py-3 text-gray-500">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah'}</td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Tidak ada user yang cocok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {drawer && (
        <UserDrawer
          key={`${drawer.mode}-${drawer.userId ?? 'new'}`}
          mode={drawer.mode}
          user={drawerUser}
          units={units}
          freeDesigners={freeDesigners}
          meId={meId}
          onClose={() => setDrawer(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}
