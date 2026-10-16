import { Package, Wallet, CircleDollarSign, Hourglass, ListChecks, CheckCircle2, CalendarClock, Users } from 'lucide-react';
import type { BundleOrderRow } from './BundleOrdersSection';

const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;

/** Statistik Order Bundle (2 x 4 kartu, gaya sama dengan KPI Summary). Hanya baca. */
export default function BundleStats({ rows, prevTotalPrice }: { rows: BundleOrderRow[]; prevTotalPrice: number }) {
  const total = rows.length;
  const trial = rows.filter((r) => r.orderType === 'Trial').length;
  const totalPrice = rows.reduce((n, r) => n + r.price, 0);
  const paidAmount = rows.reduce((n, r) => n + (r.paid ? r.price : r.dpPaid ? r.dpAmount : 0), 0);
  const remaining = totalPrice - paidAmount;
  const unpaidOrders = rows.filter((r) => !r.paid).length;
  const tasks = rows.reduce((n, r) => n + r.totalTasks, 0);
  const doneTasks = rows.reduce((n, r) => n + r.approvedTasks, 0);
  const completed = rows.filter((r) => r.completed).length;
  const waiting = rows.filter((r) => r.completed && !r.payoutMonth).length;
  const designers = new Set(rows.map((r) => r.designerId).filter(Boolean));
  const agencies = new Set(rows.filter((r) => r.isAgency).map((r) => r.designerId));
  const delta = prevTotalPrice > 0 ? Math.round(((totalPrice - prevTotalPrice) / prevTotalPrice) * 100) : null;

  const cards: { label: string; value: string; sub: React.ReactNode; icon: React.ReactNode; tone: string; highlight?: boolean }[] = [
    { label: 'Total Order', value: String(total), sub: `${trial} Trial · ${total - trial} Kontrak`, icon: <Package className="w-4 h-4" />, tone: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Total Harga Paket', value: money(totalPrice), sub: <>Bulan lalu : {money(prevTotalPrice)}{delta !== null && <span className={`ml-1.5 font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%</span>}</>, icon: <Wallet className="w-4 h-4" />, tone: 'bg-[#ff5e1f]/10 text-[#ff5e1f]' },
    { label: 'Sudah Dibayar', value: money(paidAmount), sub: 'DP + lunas ke designer', icon: <CircleDollarSign className="w-4 h-4" />, tone: 'bg-sky-500/10 text-sky-600' },
    { label: 'Sisa Dibayar', value: money(remaining), sub: `${unpaidOrders} order belum lunas`, icon: <Hourglass className="w-4 h-4" />, tone: 'bg-rose-500/10 text-rose-600' },
    { label: 'Task Selesai', value: `${doneTasks} / ${tasks}`, sub: 'approved dari total task bundle', icon: <ListChecks className="w-4 h-4" />, tone: 'bg-indigo-500/10 text-indigo-600' },
    { label: 'Order Completed', value: String(completed), sub: 'semua task approved', icon: <CheckCircle2 className="w-4 h-4" />, tone: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'Menunggu Payout Month', value: String(waiting), sub: waiting > 0 ? 'Set di tab Closing' : 'tidak ada antrian', icon: <CalendarClock className="w-4 h-4" />, tone: 'bg-amber-500/10 text-amber-600', highlight: waiting > 0 },
    { label: 'Designer Bundle', value: String(designers.size), sub: `${agencies.size} agency`, icon: <Users className="w-4 h-4" />, tone: 'bg-pink-500/10 text-pink-600' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34]">
      {cards.map((c, i) => (
        <div key={c.label} className={`p-5 flex flex-col justify-between h-[130px] border-[#f0f0f0] dark:border-[#272a34] border-b lg:border-r ${i % 4 === 3 ? 'lg:border-r-0' : ''} ${i >= 4 ? 'lg:border-b-0' : ''} ${c.highlight ? 'bg-[#fff7f2] dark:bg-[#ff5e1f]/5' : 'hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50'} transition-colors`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-sans font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">{c.label}</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.tone}`}>{c.icon}</div>
          </div>
          <div>
            <span className="text-2xl font-bold font-sans text-gray-900 dark:text-white">{c.value}</span>
            <p className="text-[11px] font-sans text-gray-400 dark:text-gray-500 mt-1">{c.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
