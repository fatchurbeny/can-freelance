'use client';

import { Key, Plug, Unplug } from 'lucide-react';
import type { NotionConfigState } from '@/components/NotionConfigClient';
import { BTN, BTN_DANGER, BTN_PRIMARY, KV_GRID, KV_LABEL, KV_ROW, KV_VALUE, PANEL_HEAD, PANEL_TITLE, TABLE, TD, TH, THEAD_ROW, TROW, DOT } from './styles';

interface Props {
  config: NotionConfigState;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenPages: () => void;
}

const STEPS = [
  {
    title: 'Buat integrasi',
    body: (
      <>Buka <span className="font-semibold text-[#c2410c]">notion.so/my-integrations</span>, buat internal integration, lalu salin <strong>Internal Integration Secret</strong>.</>
    ),
  },
  {
    title: 'Tambah page induk',
    body: (
      <>Di tab <strong>Pages &amp; Databases</strong>, tempel link page Notion tempat database task dibuat. Tandai satu page sebagai default: wizard production membuat database baru di dalamnya, jadi tidak perlu ID database.</>
    ),
  },
  {
    title: 'Beri akses (Connections)',
    body: (
      <>Di Notion buka page induk, klik <code className="font-mono">•••</code> di kanan atas, pilih <strong>Connections</strong>, lalu tambahkan integrasi dari langkah 1. Database di dalam page ikut mendapat akses.</>
    ),
  },
];

/** Tab Koneksi: identitas workspace, API key, dan panduan setup. */
export default function KoneksiTab({ config, onConnect, onDisconnect, onOpenPages }: Props) {
  return (
    <div className="flex flex-col">
      <div className={PANEL_HEAD}>
        <span className={PANEL_TITLE}>Koneksi workspace</span>
        <div className="flex flex-wrap gap-2">
          {config.exists ? (
            <>
              <button type="button" onClick={onConnect} className={BTN}><Key className="h-3.5 w-3.5" />Ganti API Key</button>
              <button type="button" onClick={onDisconnect} className={BTN_DANGER}><Unplug className="h-3.5 w-3.5" />Putuskan</button>
            </>
          ) : (
            <button type="button" onClick={onConnect} className={BTN_PRIMARY}><Plug className="h-3.5 w-3.5" />Hubungkan Notion</button>
          )}
        </div>
      </div>

      <dl className={KV_GRID}>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Workspace</dt>
          <dd className={KV_VALUE}>{config.exists ? config.workspaceName || '—' : <span className="font-normal text-gray-400">Belum terhubung</span>}</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>API key</dt>
          <dd className={`${KV_VALUE} truncate font-mono font-normal text-gray-600 dark:text-gray-300`}>{config.exists ? config.maskedApiKey : '—'}</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Status</dt>
          <dd className={`${KV_VALUE} gap-2`}>
            <span aria-hidden className={`${DOT} ${config.exists ? 'bg-[#00a67d]' : 'bg-[#6e7687]'}`} />
            {config.exists ? 'Terhubung' : 'Belum terhubung'}
          </dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Page default</dt>
          <dd className={`${KV_VALUE} justify-between gap-2`}>
            <span className="truncate">{config.defaultPageName ?? <span className="font-normal text-gray-400">Belum ada</span>}</span>
            {config.exists && (
              <button type="button" onClick={onOpenPages} className="shrink-0 py-2 text-xs font-bold text-[#c2410c] hover:underline cursor-pointer">Atur page</button>
            )}
          </dd>
        </div>
      </dl>

      <div className="border-b border-[#f0f0f0] bg-gray-50/60 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-400">Panduan setup</div>
      <div className="overflow-x-auto">
        <table className={`${TABLE} min-w-[640px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={`${TH} w-16`}>#</th>
              <th className={`${TH} w-[220px] border-l border-[#f0f0f0] dark:border-[#272a34]`}>Langkah</th>
              <th className={`${TH} border-l border-[#f0f0f0] dark:border-[#272a34]`}>Cara</th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((s, i) => (
              <tr key={s.title} className={TROW}>
                <td className={`${TD} font-bold text-[#c2410c]`}>{String(i + 1).padStart(2, '0')}</td>
                <td className={`${TD} border-l border-[#f0f0f0] font-bold text-gray-900 dark:border-[#272a34] dark:text-white`}>{s.title}</td>
                <td className={`${TD} border-l border-[#f0f0f0] leading-relaxed text-gray-600 dark:border-[#272a34] dark:text-gray-300`}>{s.body}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
