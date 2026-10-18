"use client";

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Copy, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import SelectDropdown from '@/components/SelectDropdown';
import { createUserAction, updateUserAction } from '@/app/actions/user-management';
import { resetPinAction, setUserActiveAction } from '@/app/actions/auth';
import { DESIGNER_ROLES, ROLE_KEYS, ROLE_LABELS, ROLE_SCOPE, type RoleKey } from '@/lib/permissions';
import type { UserRow } from '@/lib/user-admin';
import type { FreeDesigner, UnitOption } from './UserRoleClient';

interface Row { key: number; roleKey: string; unitId: string } // unitId '' = semua production

interface Props {
  mode: 'create' | 'edit';
  user: UserRow | null;
  units: UnitOption[];
  freeDesigners: FreeDesigner[];
  meId: string;
  onClose: () => void;
  onChanged: () => void;
}

let rowSeq = 0;
const newRow = (roleKey = '', unitId = ''): Row => ({ key: ++rowSeq, roleKey, unitId });

const label = 'text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400';
const field = 'h-11 w-full rounded-none border border-[#f0f0f0] bg-white px-3 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d] dark:text-white';
const btn = 'h-9 px-3 border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 hover:text-[#ff5e1f] disabled:opacity-50 cursor-pointer';

export default function UserDrawer({ mode, user, units, freeDesigners, meId, onClose, onChanged }: Props) {
  const [name, setName] = useState(user?.name ?? '');
  const [employmentType, setEmploymentType] = useState<string>(user?.employmentType ?? 'FULL_TIME');
  const [designerId, setDesignerId] = useState('');
  const [rows, setRows] = useState<Row[]>(() =>
    user && user.memberships.length ? user.memberships.map((m) => newRow(m.roleKey, m.productionUnitId ?? '')) : [newRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ userCode: string; pin: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isEdit = mode === 'edit' && !!user;
  const hasDesignerRole = rows.some((r) => DESIGNER_ROLES.includes(r.roleKey as RoleKey));
  const roleOptions = ROLE_KEYS.map((r) => ({ value: r, label: ROLE_LABELS[r] }));
  const unitOptionsFor = (roleKey: string) => {
    const scope = roleKey ? ROLE_SCOPE[roleKey as RoleKey] : 'unit';
    const base = units.map((u) => ({ value: u.id, label: u.name }));
    return scope === 'unit' ? base : scope === 'global' ? [{ value: '', label: 'Semua production' }] : [{ value: '', label: 'Semua production' }, ...base];
  };

  const setRow = (key: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const changeRole = (key: number, roleKey: string) => {
    const scope = ROLE_SCOPE[roleKey as RoleKey];
    // Pertahankan production yang sudah dipilih bila masih valid untuk scope role baru.
    setRows((prev) => prev.map((r) => {
      if (r.key !== key) return r;
      const unitId = scope === 'global' ? '' : scope === 'unit' ? r.unitId || units[0]?.id || '' : r.unitId;
      return { ...r, roleKey, unitId };
    }));
    if (DESIGNER_ROLES.includes(roleKey as RoleKey) && !isEdit) {
      setEmploymentType(roleKey === 'designer_fulltime' ? 'FULL_TIME' : 'FREELANCE');
    }
  };

  const memberships = () => rows.filter((r) => r.roleKey).map((r) => ({ roleKey: r.roleKey, productionUnitId: r.unitId || null }));

  const save = () =>
    startTransition(async () => {
      setError(null);
      if (isEdit) {
        const res = await updateUserAction({ userId: user!.id, name, memberships: memberships() });
        if (!res.success) { setError(res.error); return; }
        onChanged();
        toast.success('Perubahan disimpan');
        onClose();
        return;
      }
      const res = await createUserAction({ name, employmentType, memberships: memberships(), designerId: hasDesignerRole ? designerId || null : null });
      if (!res.success) { setError(res.error); return; }
      onChanged();
      setIssued({ userCode: res.userCode, pin: res.pin });
      toast.success('User dibuat');
    });

  const doReset = () =>
    startTransition(async () => {
      if (!user) return;
      const res = await resetPinAction(user.id);
      if (!res.success || !res.pin) { setError(res.error || 'Gagal mereset PIN.'); return; }
      setError(null);
      setIssued({ userCode: user.userCode, pin: res.pin });
      toast.success('PIN direset');
      onChanged();
    });

  const doToggleActive = () =>
    startTransition(async () => {
      if (!user) return;
      const res = await setUserActiveAction(user.id, !user.isActive);
      if (!res.success) { setError(res.error || 'Gagal mengubah status.'); return; }
      setError(null);
      toast.success(user.isActive ? 'Akun dinonaktifkan' : 'Akun diaktifkan');
      onChanged();
    });

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success('Disalin'); } catch { toast.error('Gagal menyalin'); }
  };

  if (typeof window === 'undefined') return null;
  const body = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[560px] flex-col border-l border-[#f0f0f0] bg-white font-sans dark:border-[#272a34] dark:bg-[#0d0e12]">
        <div className="flex shrink-0 items-center justify-between border-b border-[#f0f0f0] px-5 py-4 dark:border-[#272a34]">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{isEdit ? `Edit User · ${user!.userCode}` : 'Tambah User'}</h2>
            {isEdit && !user!.isActive && <p className="text-[11px] font-bold text-rose-500">Akun nonaktif</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center border border-[#f0f0f0] text-gray-500 hover:text-[#ff5e1f] dark:border-[#272a34] cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-1.5">
            <label htmlFor="ur-name" className={label}>Nama lengkap</label>
            <input id="ur-name" value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Nama lengkap" />
          </div>

          <div className="space-y-1.5">
            <div className={label}>Tipe</div>
            <div className="grid h-11 grid-cols-2 border border-[#f0f0f0] dark:border-[#272a34]">
              {([['FULL_TIME', 'Full-time'], ['FREELANCE', 'Freelance']] as const).map(([v, text]) => (
                <button
                  key={v}
                  type="button"
                  disabled={isEdit}
                  onClick={() => setEmploymentType(v)}
                  className={`text-xs font-bold ${employmentType === v ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'text-gray-500'} ${isEdit ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                >
                  {text}
                </button>
              ))}
            </div>
            {isEdit && <p className="text-[11px] text-gray-400">Tipe dan ID tidak bisa diubah setelah dibuat.</p>}
          </div>

          <div className="space-y-2">
            <div className={label}>Akses (role per production)</div>
            {rows.map((r) => {
              const scope = r.roleKey ? ROLE_SCOPE[r.roleKey as RoleKey] : 'unit';
              return (
                <div key={r.key} className="grid grid-cols-[1fr_1fr_40px] gap-2">
                  <SelectDropdown label="Pilih role" value={r.roleKey} onChange={(v) => changeRole(r.key, v)} options={roleOptions} buttonClassName="rounded-none" />
                  <SelectDropdown
                    label="Pilih production"
                    value={r.unitId}
                    onChange={(v) => setRow(r.key, { unitId: v })}
                    options={unitOptionsFor(r.roleKey)}
                    disabled={scope === 'global'}
                    buttonClassName="rounded-none"
                  />
                  <button type="button" onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((x) => x.key !== r.key) : prev))} aria-label="Hapus akses" className="flex h-11 items-center justify-center border border-[#f0f0f0] text-gray-400 hover:text-[#ff5e1f] dark:border-[#272a34] cursor-pointer"><X className="h-4 w-4" /></button>
                </div>
              );
            })}
            <button type="button" onClick={() => setRows((prev) => [...prev, newRow()])} className="flex h-10 w-full items-center justify-center gap-1.5 border border-dashed border-[#d9dce1] text-xs font-semibold text-gray-500 hover:text-[#ff5e1f] dark:border-[#343846] cursor-pointer">
              <Plus className="h-3.5 w-3.5" /> Tambah akses
            </button>
          </div>

          {hasDesignerRole && (
            <div className="space-y-1.5">
              <div className={label}>Profil designer</div>
              {isEdit ? (
                <div className="flex h-11 items-center border border-[#f0f0f0] bg-gray-50/50 px-3 text-xs font-bold dark:border-[#272a34] dark:bg-[#16181d]/50">{user!.designerName ?? '—'}</div>
              ) : (
                <SelectDropdown
                  label="Pilih profil designer"
                  value={designerId}
                  onChange={setDesignerId}
                  options={freeDesigners.map((d) => ({ value: d.id, label: d.displayName + (d.contractType ? ` · ${d.contractType}` : '') }))}
                  buttonClassName="rounded-none"
                />
              )}
              {!isEdit && freeDesigners.length === 0 && <p className="text-[11px] text-amber-600">Semua profil designer sudah punya akun. Tambahkan profil baru di Account &amp; Team.</p>}
            </div>
          )}

          {isEdit && (
            <div className="flex flex-wrap gap-2 border-t border-[#f0f0f0] pt-4 dark:border-[#272a34]">
              <button type="button" className={btn} disabled={pending} onClick={doReset}>Reset PIN</button>
              <button type="button" className={btn} disabled={pending} onClick={doToggleActive}>{user!.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
              {user!.id === meId && <span className="self-center text-[11px] text-gray-400">Ini akun Anda sendiri.</span>}
            </div>
          )}

          {issued && (
            <div className="space-y-2 border border-dashed border-[#ff5e1f]/60 bg-[#ff5e1f]/5 p-3">
              <div className="text-xs font-bold text-[#ff5e1f]">Catat sekarang — PIN tidak ditampilkan lagi</div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-sm">
                <span>ID: <strong>{issued.userCode}</strong></span>
                <span>PIN awal: <strong>{issued.pin}</strong></span>
                <button type="button" onClick={() => copy(`ID: ${issued.userCode}\nPIN: ${issued.pin}`)} className="inline-flex items-center gap-1 font-sans text-[11px] font-bold uppercase text-gray-600 hover:text-[#ff5e1f] dark:text-gray-300 cursor-pointer"><Copy className="h-3 w-3" /> Salin</button>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">User wajib mengganti PIN saat login pertama.</div>
            </div>
          )}

          {error && <div role="alert" className="border border-dashed border-rose-400 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
        </div>

        <div className="grid shrink-0 grid-cols-2 divide-x divide-[#f0f0f0] border-t border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
          <button type="button" onClick={onClose} className="h-12 bg-gray-50/50 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-100 dark:bg-[#16181d]/50 dark:text-gray-300 cursor-pointer">{issued ? 'Selesai' : 'Batal'}</button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !name.trim() || !!(issued && !isEdit)}
            className="flex h-12 items-center justify-center gap-2 bg-[#ff5e1f] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{pending ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Simpan user'}</span>
          </button>
        </div>
      </div>
    </div>
  );
  return createPortal(body, document.body);
}
