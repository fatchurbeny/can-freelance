'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { setBundleOrderPayoutMonthAction } from '@/app/actions/bundle-order';
import MonthCalendarPicker from '../MonthCalendarPicker';
import type { BundleOrderRow } from './BundleOrdersSection';

const money = (n: number) => `IDR ${n.toLocaleString('id-ID')}`;

/** Antrian Closing untuk order bundle yang selesai tapi belum punya Payout Month. */
export default function BundleClosingQueue({ rows, defaultMonth }: { rows: BundleOrderRow[]; defaultMonth: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [month, setMonth] = useState(defaultMonth === 'Unknown' ? '' : defaultMonth);
  const [saving, setSaving] = useState(false);
  if (rows.length === 0) return null;

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const sum = rows.filter((r) => selected.includes(r.id)).reduce((n, r) => n + r.price, 0);

  const apply = async () => {
    setSaving(true);
    const res = await setBundleOrderPayoutMonthAction(selected, month);
    setSaving(false);
    if (!res.success) return void toast.error(res.error || 'Gagal menyimpan Payout Month.');
    toast.success(`Payout Month ${month} diset untuk ${selected.length} order.`);
    setSelected([]);
    router.refresh();
  };

  return (
    <div className="bg-white dark:bg-[#0d0e12] border-b border-[#f0f0f0] dark:border-[#272a34] font-sans">
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/70 dark:bg-emerald-500/5 border-b border-[#f0f0f0] dark:border-[#272a34] text-xs font-bold text-gray-900 dark:text-white">
        <span className="flex items-center gap-2"><Package className="w-4 h-4 text-emerald-600" /> Order Bundle <span className="font-medium text-gray-500">· selesai, belum punya Payout Month · {rows.length} order</span></span>
        <button type="button" onClick={() => setSelected(selected.length === rows.length ? [] : rows.map((r) => r.id))} className="text-[#ff5e1f] cursor-pointer">{selected.length === rows.length ? 'Batal pilih' : 'Pilih semua'}</button>
      </div>
      {rows.map((r) => (
        <label key={r.id} className={`flex items-center gap-4 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] text-xs cursor-pointer ${selected.includes(r.id) ? 'bg-[#fff7f2] dark:bg-[#ff5e1f]/5' : ''}`}>
          <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} className="w-4 h-4 accent-[#ff5e1f]" />
          <span className="flex-1 min-w-0 font-bold text-gray-900 dark:text-white truncate">{r.bundleName} · {r.designerName}</span>
          <span className="text-gray-500">Order {r.period || '-'} · {r.approvedTasks}/{r.totalTasks} task</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 w-28 text-right">{money(r.price)}</span>
        </label>
      ))}
      {selected.length > 0 && (
        <div className="flex flex-wrap items-stretch justify-between bg-[#16181d] text-white text-xs">
          <div className="px-4 py-3 flex items-center"><strong>{selected.length} order dipilih</strong> <span className="ml-2 text-gray-300">· {money(sum)}</span></div>
          <div className="flex items-stretch">
            <div className="w-56 bg-white text-gray-900 flex items-stretch"><MonthCalendarPicker value={month} placeholder="Pilih Payout Month" onChange={setMonth} /></div>
            <button type="button" onClick={apply} disabled={saving || !month} className="px-6 bg-[#ff5e1f] hover:bg-[#ff7038] font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50">{saving ? 'Menyimpan…' : 'Set Payout Month'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
