'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import type { BundleOrderRow } from './BundleOrdersSection';

const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;
const dateLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null);

const LABEL = 'w-[130px] sm:w-[160px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-4 sm:px-5 py-3 flex items-center font-sans font-bold text-gray-500 dark:text-gray-400 select-none';
const VALUE = 'flex-1 min-w-0 px-4 sm:px-5 py-3 flex items-center flex-wrap gap-2 font-sans text-xs font-bold text-gray-900 dark:text-white';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-stretch text-xs min-h-[44px]">
      <div className={LABEL}>{label}</div>
      <div className={VALUE}>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50 dark:bg-[#16181d]/50">{children}</div>;
}

/** Detail satu order bundle dalam slide drawer: info, pembayaran, task per board, dan aksi. */
export default function BundleOrderDetailDrawer({ row, onClose, actions }: { row: BundleOrderRow | null; onClose: () => void; actions: ReactNode }) {
  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  if (!row || typeof window === 'undefined') return null;
  const paidAmount = row.paid ? row.price : row.dpPaid ? row.dpAmount : 0;
  const remaining = row.price - paidAmount;
  const dp = dateLabel(row.dpPaidAt);
  const lunas = dateLabel(row.paidAt);

  return createPortal(
    <div className="fixed inset-0 z-70">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/40 cursor-pointer" aria-label="Close detail" />
      <div className="absolute right-0 top-0 h-full w-full max-w-140 bg-white dark:bg-[#0d0e12] border-l border-[#f0f0f0] dark:border-[#272a34] shadow-2xl flex flex-col font-sans animate-[slideInRight_180ms_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0 mr-3">
            <div className="w-8 h-8 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-[#ff5e1f] flex items-center justify-center shrink-0"><Package className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider truncate">{row.bundleName}</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">Detail order bundle · {row.designerName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close detail" className="flex size-8 shrink-0 items-center justify-center border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <Row label="Tipe Order">
            <span className={`px-2 py-0.5 text-[10px] font-bold ${row.orderType === 'Kontrak' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>{row.orderType === 'Kontrak' ? 'KONTRAK' : 'TRIAL'}</span>
          </Row>
          <Row label="Designer">{row.designerName}{row.isAgency && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">AGENCY</span>}</Row>
          <Row label="Periode Order">{row.period || '-'}</Row>
          <Row label="Payout Month">{row.payoutMonth || <span className="font-medium text-amber-600">Belum diset · masuk antrian Closing</span>}</Row>
          <Row label="Status Task">
            <span className={`px-2 py-0.5 text-[11px] font-bold ${row.completed ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600'}`}>{row.completed ? 'COMPLETED' : 'IN PROGRESS'}</span>
            <span className="font-medium text-gray-500">{row.approvedTasks}/{row.totalTasks} task approved</span>
          </Row>
          <Row label="Harga Paket"><span className="text-emerald-600 dark:text-emerald-400">{money(row.price)}</span></Row>

          <SectionTitle>Pembayaran ke designer</SectionTitle>
          <Row label="Skema">{row.paymentType === 'DP' ? 'DP + Pelunasan' : 'Lunas'}</Row>
          {row.paymentType === 'DP' && <Row label="Nominal DP">{money(row.dpAmount)}</Row>}
          <Row label="Status">
            <span className={`px-2 py-0.5 text-[11px] font-bold ${row.paid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : row.dpPaid ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-gray-100 dark:bg-[#20232b] text-gray-500'}`}>{row.paid ? 'LUNAS' : row.dpPaid ? 'DP DIBAYAR' : 'BELUM BAYAR'}</span>
          </Row>
          <Row label="Dibayar / Sisa"><span className="text-sky-600 dark:text-sky-400">{money(paidAmount)}</span><span className="font-medium text-gray-400">/</span><span className="text-rose-600 dark:text-rose-400">{money(remaining)}</span></Row>
          {(dp || lunas) && (
            <Row label="Riwayat">
              <div className="flex flex-col gap-1 font-medium text-gray-600 dark:text-gray-300">
                {dp && <span>DP dibayar · {dp}</span>}
                {lunas && <span>Lunas · {lunas}</span>}
              </div>
            </Row>
          )}

          <SectionTitle>Task per board</SectionTitle>
          {row.tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-xs">
              <div className="min-w-0">
                <div className="font-bold text-gray-900 dark:text-white truncate">{t.board}</div>
                <div className="text-[11px] text-gray-400 truncate">{t.name || 'Tanpa judul'}</div>
              </div>
              <span className={`px-2 py-0.5 text-[11px] font-bold shrink-0 ${t.approved ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-[#20232b] text-gray-500'}`}>{t.approved ? 'APPROVED' : 'BELUM'}</span>
            </div>
          ))}
          {row.tasks.length === 0 && <div className="px-5 py-6 text-center text-xs text-gray-400">Belum ada task.</div>}
        </div>

        <div className="shrink-0 border-t border-[#f0f0f0] dark:border-[#272a34] p-4 flex flex-wrap gap-2 bg-gray-50/50 dark:bg-[#16181d]/50">{actions}</div>
      </div>
    </div>,
    document.body,
  );
}
