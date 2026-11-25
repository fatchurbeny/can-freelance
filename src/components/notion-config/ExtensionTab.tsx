'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import manifest from '../../../tools/canva-insights-extension/manifest.json';
import { BTN_PRIMARY, KV_GRID, KV_LABEL, KV_ROW, KV_VALUE, PANEL_HEAD, PANEL_NOTE, PANEL_TITLE, TABLE, TD, TH, THEAD_ROW, TROW } from './styles';

/** Dibuat oleh scripts/pack-extension.sh saat `npm run build`; `?v=` mencegah cache versi lama. */
const ZIP_URL = `/downloads/canva-insights-extension.zip?v=${manifest.version}`;
const ZIP_NAME = `canva-insights-extension-${manifest.version}.zip`;

const STEPS = [
  {
    title: 'Unduh & ekstrak',
    body: (
      <>Unduh zip, lalu ekstrak. Hasilnya folder <code className="font-mono">canva-insights-extension</code>. Simpan di tempat tetap (mis. Documents), jangan di Downloads yang sering dibersihkan.</>
    ),
  },
  {
    title: 'Pasang (sekali per profil Chrome)',
    body: (
      <>Buka <code className="font-mono">chrome://extensions</code>, aktifkan <strong>Developer mode</strong>, klik <strong>Load unpacked</strong>, pilih folder tadi. Pin ikon extension di toolbar.</>
    ),
  },
  {
    title: 'Isi pengaturan',
    body: (
      <>Klik ikon extension → <strong>Buka Pengaturan</strong>. Isi URL dashboard (lihat di atas), token ingest dari admin, dan nama perangkat. <strong>Simpan</strong>, lalu <strong>Uji koneksi</strong>.</>
    ),
  },
  {
    title: 'Memperbarui versi',
    body: (
      <>Timpa isi folder yang <strong>sama</strong> dengan isi zip baru, lalu klik <strong>Reload</strong> di <code className="font-mono">chrome://extensions</code>. Jangan Load unpacked dari folder baru: ID extension berubah dan token, URL, serta jadwal sinkron harus diisi ulang.</>
    ),
  },
];

/** Tab Extension: unduh extension Chrome Canva Insights dan panduan pasang/perbarui. */
export default function ExtensionTab() {
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="flex flex-col">
      <div className={PANEL_HEAD}>
        <div className="space-y-0.5">
          <span className={PANEL_TITLE}>Extension Chrome Canva Insights</span>
          <p className={PANEL_NOTE}>Mengirim Applies/Usages dari dashboard Creator Canva ke tab Canva Insights di Production.</p>
        </div>
        <a href={ZIP_URL} download={ZIP_NAME} className={BTN_PRIMARY}>
          <Download className="h-3.5 w-3.5" />Unduh v{manifest.version}
        </a>
      </div>

      <dl className={KV_GRID}>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Versi</dt>
          <dd className={KV_VALUE}>{manifest.version}</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>URL dashboard</dt>
          <dd className={`${KV_VALUE} truncate font-mono font-normal text-gray-600 dark:text-gray-300`}>{origin || '—'}</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Browser</dt>
          <dd className={`${KV_VALUE} font-normal text-gray-600 dark:text-gray-300`}>Chrome {manifest.minimum_chrome_version}+ atau browser Chromium lain</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Token</dt>
          <dd className={`${KV_VALUE} font-normal text-gray-600 dark:text-gray-300`}>Minta ke admin (tidak ditampilkan di sini)</dd>
        </div>
      </dl>

      <div className="border-b border-[#f0f0f0] bg-gray-50/60 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-400">Cara pasang</div>
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
