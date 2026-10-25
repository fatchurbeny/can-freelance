"use client";

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Library, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import SelectDropdown from '@/components/SelectDropdown';
import {
  createAssetDatabaseAction,
  createAssetsRelationAction,
  getAssetNotionStatusAction,
  linkAssetDatabaseAction,
} from '@/app/actions/notion-config';
import { formatRelative } from './asset-ui';
import NotionAssetImport from './NotionAssetImport';
import SubTabs, { useSubTab } from '@/components/notion-config/SubTabs';

const SUBS = ['database', 'relation', 'impor'] as const;

type Status = Extract<Awaited<ReturnType<typeof getAssetNotionStatusAction>>, { success: true; exists: true }>;

const RELATION_LABEL: Record<string, { text: string; dot: string }> = {
  exists: { text: 'Ada', dot: 'bg-[#00a67d]' },
  created: { text: 'Ada', dot: 'bg-[#00a67d]' },
  missing: { text: 'Belum ada', dot: 'bg-[#6e7687]' },
  conflict: { text: 'Nama "Assets" dipakai properti lain', dot: 'bg-rose-500' },
  error: { text: 'Tidak bisa dibaca', dot: 'bg-rose-500' },
  no_asset_db: { text: 'Database aset belum terhubung', dot: 'bg-[#6e7687]' },
};

const cell = 'h-11 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] text-xs';
const headCell = 'px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400';

/** Notion Config → Asset Library: database mirror aset, pemetaan properti, relation "Assets" per production. */
export default function AssetLibraryNotionCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageId, setPageId] = useState('');
  const [linkId, setLinkId] = useState('');
  const [pending, startTransition] = useTransition();
  const [sub, setSub] = useSubTab(SUBS, 'database');

  const load = useCallback(async () => {
    const res = await getAssetNotionStatusAction();
    if (!res.success) { setError(res.error); return; }
    if (!res.exists) { setStatus(null); return; }
    setError(null);
    setStatus(res);
    setPageId((prev) => prev || res.pages.find((p) => p.isDefault)?.id || res.pages[0]?.id || '');
  }, []);

  useEffect(() => { load(); }, [load]);

  const missingRelations = status?.database ? status.relations.filter((r) => r.state === 'missing').length : 0;

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okMessage: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.success) { toast.error(res.error || 'Gagal'); return; }
      toast.success(okMessage);
      await load();
    });

  return (
    <section aria-label="Asset Library" className="w-full bg-white font-sans dark:bg-[#0d0e12]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f0f0] px-5 py-3 dark:border-[#272a34]">
        <div className="space-y-0.5">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
            <Library className="h-4 w-4 text-[#ff5e1f]" />
            Database Asset Library
            {status?.database ? (
              <span className="bg-[#00a67d] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Terhubung</span>
            ) : (
              <span className="bg-[#6e7687] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Belum terhubung</span>
            )}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">App jadi tempat input utama; database Notion ikut tersinkron dua arah.</p>
        </div>
        {status?.database && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <span><strong className="text-gray-900 dark:text-white">{status.counts.total}</strong> aset</span>
            <span><strong className="text-gray-900 dark:text-white">{status.counts.pending}</strong> menunggu{status.counts.failed > 0 ? ` · ${status.counts.failed} gagal` : ''}</span>
            <span>sync {formatRelative(status.counts.lastSyncedAt)}</span>
          </div>
        )}
      </div>

      {error && <div className="px-5 py-4 text-xs font-semibold text-rose-600">{error}</div>}
      {!status && !error && (
        <div className="flex items-center gap-2 px-5 py-6 text-xs text-gray-500"><RefreshCw className="h-4 w-4 animate-spin text-[#ff5e1f]" /> Memuat status Asset Library…</div>
      )}

      {status && (
        <SubTabs
          label="Bagian Asset Library"
          active={sub}
          onChange={setSub}
          items={[
            { id: 'database', label: 'Database & Pemetaan' },
            { id: 'relation', label: 'Relation Production', badge: missingRelations > 0 ? `${missingRelations} belum` : null, tone: 'alert' },
            { id: 'impor', label: 'Impor dari Notion' },
          ]}
        />
      )}

      {status && sub === 'database' && (
        <div className="grid grid-cols-1 divide-y divide-[#f0f0f0] dark:divide-[#272a34] xl:grid-cols-2 xl:divide-x xl:divide-y-0">
          <div className="flex flex-col">
            {status.database ? (
              <dl className="divide-y divide-[#f0f0f0] text-xs dark:divide-[#272a34]">
                {[
                  ['Database', status.database.name],
                  ['Page induk', status.database.parentPageName ?? '—'],
                  ['Sync terakhir', `${formatRelative(status.counts.lastSyncedAt)} · ${status.counts.total} aset`],
                  ['Antrean', status.counts.failed > 0 ? `${status.counts.pending} menunggu · ${status.counts.failed} gagal` : `${status.counts.pending} menunggu`],
                ].map(([k, v]) => (
                  <div key={k} className="flex min-h-11">
                    <dt className="flex w-[150px] shrink-0 items-center border-r border-[#f0f0f0] bg-gray-50/50 px-5 font-bold text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/50 dark:text-gray-400">{k}</dt>
                    <dd className="flex items-center px-5 font-bold text-gray-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="space-y-4 p-5 text-xs">
                <div className="space-y-2">
                  <p className="font-bold text-gray-900 dark:text-white">Buat database baru</p>
                  {status.pages.length === 0 ? (
                    <p className="text-gray-500">Tambahkan page induk dulu di Pages &amp; Databases.</p>
                  ) : (
                    <div className="flex flex-wrap items-stretch gap-2">
                      <div className="min-w-[200px] flex-1">
                        <SelectDropdown label="Page induk" value={pageId} onChange={setPageId} buttonClassName={cell}
                          options={status.pages.map((p) => ({ value: p.id, label: p.isDefault ? `${p.name} (default)` : p.name }))} />
                      </div>
                      <button
                        type="button"
                        disabled={pending || !pageId}
                        onClick={() => run(() => createAssetDatabaseAction(pageId), 'Database Asset Library dibuat')}
                        className="h-11 bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer"
                      >
                        Buat Database
                      </button>
                    </div>
                  )}
                </div>
                {status.candidates.length > 0 && (
                  <div className="space-y-2 border-t border-[#f0f0f0] pt-4 dark:border-[#272a34]">
                    <p className="font-bold text-gray-900 dark:text-white">Atau pakai database terdaftar</p>
                    <div className="flex flex-wrap items-stretch gap-2">
                      <div className="min-w-[200px] flex-1">
                        <SelectDropdown label="Database" value={linkId} onChange={setLinkId} buttonClassName={cell}
                          options={[{ value: '', label: 'Pilih database…' }, ...status.candidates.map((c) => ({ value: c.id, label: c.name }))]} />
                      </div>
                      <button
                        type="button"
                        disabled={pending || !linkId}
                        onClick={() => run(() => linkAssetDatabaseAction(linkId), 'Database Asset Library terhubung')}
                        className="h-11 border border-[#f0f0f0] bg-white px-4 text-xs font-bold uppercase tracking-wider text-gray-700 hover:text-[#ff5e1f] disabled:opacity-50 dark:border-[#272a34] dark:bg-[#0d0e12] dark:text-gray-300 cursor-pointer"
                      >
                        Hubungkan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
          <div>
              <div className="border-b border-[#f0f0f0] px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:border-[#272a34]">Pemetaan properti</div>
              <div className="grid grid-cols-2 border-b border-[#f0f0f0] bg-gray-50/50 dark:border-[#272a34] dark:bg-[#16181d]/50">
                <span className={`${headCell} border-r border-[#f0f0f0] dark:border-[#272a34]`}>Field app</span>
                <span className={headCell}>Properti Notion</span>
              </div>
              <div className="divide-y divide-[#f0f0f0] text-xs dark:divide-[#272a34]">
                {status.propertyMap.map((m) => (
                  <div key={m.property} className="grid grid-cols-2">
                    <span className="border-r border-[#f0f0f0] px-5 py-2.5 font-bold text-gray-900 dark:border-[#272a34] dark:text-white">{m.field}</span>
                    <span className="px-5 py-2.5 font-semibold text-gray-700 dark:text-gray-300">{m.property} <span className="font-normal text-gray-400">· {m.type}</span></span>
                  </div>
                ))}
              </div>
            </div>
        </div>
      )}

      {status && sub === 'relation' && (
          <div className="flex flex-col">
            <div className="border-b border-[#f0f0f0] bg-gray-50/50 px-5 py-3.5 dark:border-[#272a34] dark:bg-[#16181d]/50">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Relation &quot;Assets&quot; di database task</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Dipakai untuk hitungan &quot;Dipakai di N task&quot;. Catatan halaman tetap di section Assets pada brief.</p>
            </div>
            {!status.database ? (
              <p className="px-5 py-4 text-xs text-gray-500">Hubungkan database Asset Library dulu, lalu buat relation per production.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 border-b border-[#f0f0f0] bg-gray-50/50 dark:border-[#272a34] dark:bg-[#16181d]/50">
                  <span className={`${headCell} border-r border-[#f0f0f0] dark:border-[#272a34]`}>Production</span>
                  <span className={headCell}>Relation</span>
                </div>
                <div className="divide-y divide-[#f0f0f0] text-xs dark:divide-[#272a34]">
                  {status.relations.map((r) => {
                    const label = RELATION_LABEL[r.state] ?? RELATION_LABEL.missing;
                    return (
                      <div key={r.unitId} className="grid min-h-11 grid-cols-2">
                        <span className="flex items-center border-r border-[#f0f0f0] px-5 font-bold text-gray-900 dark:border-[#272a34] dark:text-white">{r.unitName}</span>
                        <span className="flex items-center justify-between gap-2 pl-5 pr-3 font-bold text-gray-900 dark:text-white">
                          <span className="flex items-center gap-2"><span aria-hidden className={`h-2 w-2 shrink-0 ${label.dot}`} />{label.text}</span>
                          {r.state === 'missing' && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => run(() => createAssetsRelationAction(r.unitId), `Relation dibuat di ${r.unitName}`)}
                              className="h-8 bg-[#ff5e1f] px-3 text-[11px] font-bold uppercase text-white hover:bg-[#ff7038] disabled:opacity-50 cursor-pointer"
                            >
                              Buat relation
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="px-5 py-3 text-xs text-gray-500 dark:text-gray-400">Relation menambah properti &quot;Assets&quot; di database task Notion. Production baru otomatis dibuatkan saat database task-nya dibuat atau diganti.</p>
              </>
            )}
          </div>
      )}

      {status && sub === 'impor' && <NotionAssetImport candidates={status.candidates} onImported={load} />}
    </section>
  );
}
