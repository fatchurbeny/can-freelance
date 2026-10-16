import Link from 'next/link';
import type { BundleOrderRow } from './BundleOrdersSection';

const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** Kelompok "Order Bundle" di Payout Breakdown: order yang Payout Month-nya = bulan terpilih. */
export default function BundlePayoutGroup({ rows, tabHref }: { rows: BundleOrderRow[]; tabHref: string }) {
  const subtotal = rows.filter((r) => r.completed).reduce((n, r) => n + r.price, 0);
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50/70 dark:bg-emerald-500/5 border-y border-[#f0f0f0] dark:border-[#272a34] font-sans text-xs font-bold text-gray-900 dark:text-white">
        <span>Order Bundle <span className="font-medium text-gray-500">· {rows.length} order · dihitung payout bila semua task approved</span></span>
        <span className="text-emerald-600 dark:text-emerald-400">{money(subtotal)}</span>
      </div>
      {rows.length === 0 && <div className="p-6 text-center text-xs font-sans text-gray-400 dark:text-gray-500">Belum ada order bundle dengan Payout Month bulan ini.</div>}
      {rows.map((r) => {
        const paidAmount = r.paid ? r.price : r.dpPaid ? r.dpAmount : 0;
        return (
          <div key={r.id} className="flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-8 p-4 border-b border-[#f0f0f0] dark:border-[#272a34] font-sans">
            <div className="flex items-center gap-3 w-[220px] shrink-0">
              <div className="w-9 h-9 rounded-full border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center text-xs font-bold bg-gray-50 dark:bg-[#16181d] text-gray-900 dark:text-white">{initials(r.designerName)}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5"><h3 className="font-bold text-xs text-gray-900 dark:text-white truncate">{r.designerName}</h3>{r.isAgency && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">AGENCY</span>}</div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{r.bundleName} · {r.orderType === 'Kontrak' ? 'Kontrak' : 'Trial'}</p>
              </div>
            </div>
            <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-8 flex-1 w-full justify-between lg:justify-start">
              {[
                ['Task', `${r.approvedTasks}/${r.totalTasks}`, 'text-indigo-600 dark:text-indigo-400'],
                ['Dibayar', paidAmount.toLocaleString('id-ID'), 'text-sky-600 dark:text-sky-400'],
                ['Sisa', (r.price - paidAmount).toLocaleString('id-ID'), 'text-rose-600 dark:text-rose-400'],
                ['Harga Paket', money(r.price), 'text-emerald-600 dark:text-[#ff5e1f]'],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex flex-col items-center"><span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">{label}</span><span className={`font-bold text-xs ${tone}`}>{value}</span></div>
              ))}
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              <span className={`px-3 py-1 text-[11px] font-bold border ${r.paid ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400' : r.dpPaid ? 'border-sky-200 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/20 dark:text-sky-400' : 'border-gray-200 bg-gray-50 text-gray-500 dark:bg-[#16181d] dark:border-[#272a34]'}`}>{r.paid ? 'Lunas' : r.dpPaid ? 'DP' : 'Unpaid'}</span>
              <Link href={tabHref} className="border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#20232b]">Kelola →</Link>
            </div>
          </div>
        );
      })}
    </>
  );
}
