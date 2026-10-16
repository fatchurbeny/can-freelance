"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Files, Plus, ChevronRight, MoreHorizontal, Pencil, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { setProductionUnitArchivedAction, deleteProductionUnitAction } from '@/app/actions/production-unit';
import TopBar from './TopBar';
import EditProductionDrawer from './EditProductionDrawer';

interface UnitRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  notionTaskDbId: string;
  dropboxRoot: string | null;
  platform: { id: string; name: string; outputType: string };
  _count: { tasks: number };
}

interface Props {
  units: UnitRow[];
  latestSyncLog: any;
}

const OUTPUT_LABEL: Record<string, string> = {
  canva_link: 'Canva Link',
  dropbox_link: 'Dropbox Link',
};

export default function ProductionHubClient({ units, latestSyncLog }: Props) {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<UnitRow | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current?.contains(target) || target.closest('[data-menu-trigger]')) return;
      setMenuId(null);
    };
    const close = () => setMenuId(null);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, []);

  const archivedCount = units.filter((u) => !u.isActive).length;
  const menuUnit = units.find((u) => u.id === menuId) ?? null;
  const visibleUnits = units.filter((u) => showArchived || u.isActive);

  const report = (verb: string, res: { success: boolean; error?: string; sync?: { status: string; skippedUnits: string[]; errorMessage?: string } }) => {
    if (!res.success) return void toast.error(res.error || 'Gagal.');
    const sync = res.sync;
    if (sync && sync.status === 'failed') toast.error(`${verb}, tetapi sync Notion gagal: ${sync.errorMessage ?? 'unknown'}`);
    else if (sync?.skippedUnits.length) toast.success(`${verb}. Sync selesai, dilewati: ${sync.skippedUnits.join(', ')}`);
    else toast.success(`${verb}. Sync Notion dijalankan.`);
    window.dispatchEvent(new Event('production-units-changed'));
    router.refresh();
  };

  const archive = async (unit: UnitRow, archived: boolean) => {
    setMenuId(null);
    setBusyId(unit.id);
    const res = await setProductionUnitArchivedAction({ unitId: unit.id, archived });
    setBusyId(null);
    report(archived ? `"${unit.name}" diarsipkan` : `"${unit.name}" dipulihkan`, res);
  };

  const remove = async (unit: UnitRow) => {
    setMenuId(null);
    if (!window.confirm(`Hapus production "${unit.name}" dari aplikasi? Database Notion tidak ikut terhapus.`)) return;
    setBusyId(unit.id);
    const res = await deleteProductionUnitAction({ unitId: unit.id });
    setBusyId(null);
    report(`"${unit.name}" dihapus`, res);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="PRODUCTION" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-4 p-3 sm:p-6 md:p-8 bg-grid-pattern">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-sans text-base font-bold text-[#262626] dark:text-white">Production Hub</h1>
              <p className="font-sans text-xs text-gray-500 dark:text-gray-400">
                Setiap production memiliki database Notion, platform, dan alur output sendiri.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {archivedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-xs font-semibold font-sans text-gray-600 dark:text-gray-300 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {showArchived ? 'Sembunyikan diarsipkan' : `Diarsipkan (${archivedCount})`}
                </button>
              )}
              <Link
                href="/production/new"
                className="flex items-center gap-1.5 px-3 h-9 rounded-none bg-[#ff5e1f] text-white text-xs font-semibold font-sans"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Production
              </Link>
            </div>
          </div>

          <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-gray-50 dark:bg-[#16181d] text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                  <th className="px-4 py-3 font-bold">Production</th>
                  <th className="px-4 py-3 font-bold">Platform</th>
                  <th className="px-4 py-3 font-bold">Output</th>
                  <th className="px-4 py-3 font-bold text-right">Task</th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {visibleUnits.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Belum ada production.
                    </td>
                  </tr>
                )}
                {visibleUnits.map((unit) => (
                  <tr
                    key={unit.id}
                    className={`${unit.isActive ? '' : 'opacity-60'} ${busyId === unit.id ? 'pointer-events-none animate-pulse' : ''} border-b border-[#f0f0f0] dark:border-[#272a34] last:border-b-0 hover:bg-gray-50 dark:hover:bg-[#16181d]/60 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <Link href={`/production/${unit.slug}`} className="flex items-center gap-2.5 font-semibold text-[#262626] dark:text-white hover:text-[#ff5e1f]">
                        <Files className="w-4 h-4 text-[#ff5e1f] shrink-0" />
                        {unit.name}
                        {!unit.isActive && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-[#20232b] text-gray-500">ARSIP</span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{unit.platform.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {OUTPUT_LABEL[unit.platform.outputType] ?? unit.platform.outputType}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#262626] dark:text-white">{unit._count.tasks}</td>
                    <td className="px-4 py-3 text-gray-400">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          data-menu-trigger
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setMenuId(menuId === unit.id ? null : unit.id);
                          }}
                          aria-label={`Aksi ${unit.name}`}
                          aria-haspopup="menu"
                          className="p-1 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <Link href={`/production/${unit.slug}`} aria-label={`Buka ${unit.name}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {menuUnit && menuPos && typeof window !== 'undefined' && createPortal(
                        
                          <div role="menu" ref={menuRef} style={{ top: menuPos.top, right: menuPos.right }} className="fixed z-[80] min-w-[170px] rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] p-1.5 shadow-xl text-xs font-sans">
                            <button type="button" role="menuitem" onClick={() => { setMenuId(null); setEditing(menuUnit); }} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] cursor-pointer">
                              <Pencil className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button type="button" role="menuitem" onClick={() => archive(menuUnit, menuUnit.isActive)} className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b] cursor-pointer">
                              {menuUnit.isActive ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                              {menuUnit.isActive ? 'Arsipkan' : 'Pulihkan'}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={menuUnit._count.tasks > 0}
                              onClick={() => remove(menuUnit)}
                              title={menuUnit._count.tasks > 0 ? 'Production masih punya task, arsipkan saja' : undefined}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Hapus
                            </button>
                          </div>,
        document.body,
      )}

      <EditProductionDrawer unit={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
