import Link from 'next/link';
import { Download } from 'lucide-react';
import OwnMonthSelect from './OwnMonthSelect';
import prisma from '@/lib/prisma';
import TopBar from '@/components/TopBar';
import { getBundleOrdersForPeriod, getPlatformRates } from '@/lib/queries';

function formatCurrency(amount: number) {
  return `IDR ${Math.round(amount).toLocaleString('id-ID')}`;
}

interface Props {
  designerId: string | null;
  selectedMonth: string;
  availableMonths: string[];
}

/** Billing untuk designer: hanya data milik sendiri, tanpa total tim, leaderboard, maupun nama brand. */
export default async function OwnBillingView({ designerId, selectedMonth, availableMonths }: Props) {
  const platformRates = await getPlatformRates();

  const designer = designerId
    ? await prisma.designer.findUnique({
        where: { id: designerId },
        include: {
          tasks: {
            where: { payrollMonth: selectedMonth, bundleOrderId: null, designStatus: { countsAsApproved: true } },
            include: { doctype: true, productionUnit: { select: { name: true } } },
            orderBy: { createdTime: 'asc' },
          },
        },
      })
    : null;

  const rows = (designer?.tasks ?? []).map((t) => {
    const qty = Number(t.qtySubmit || 0);
    const pages = Number(t.pages || 0);
    const poolRate = Number(t.doctype?.poolRate || 0);
    const price = platformRates.priceFor(t.doctype, t.payrollMonth);
    const payment = designer?.status === 'Resign' || !price.priced ? 0 : qty * pages * poolRate * price.rate;
    return { id: t.id, name: t.name, unit: t.productionUnit.name, doctype: t.doctype?.displayName ?? '-', qty, pages, payment };
  });

  const bundle = designerId ? await getBundleOrdersForPeriod(selectedMonth) : null;
  const bundleRows = (bundle?.rows ?? []).filter((r) => r.designerId === designerId);

  const satuanTotal = rows.reduce((n, r) => n + r.payment, 0);
  const bundleTotal = (designerId && bundle?.payoutByDesigner.get(designerId)) || 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5]">
      <TopBar badgeLabel="BILLING STATEMENT" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex-1 md:ml-56 p-3 sm:p-6 md:p-8 space-y-6 overflow-x-hidden bg-grid-pattern">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <OwnMonthSelect months={availableMonths} selected={selectedMonth} />
            {designerId && (
              <Link
                href={`/billing-statement/print?designerId=${designerId}&paymentMonth=${encodeURIComponent(selectedMonth)}`}
                target="_blank"
                rel="noopener"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-none bg-[#ff5e1f] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038]"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Statement</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0f0] dark:divide-[#272a34] rounded-none border border-[#f0f0f0] dark:border-[#272a34]">
            <div className="p-4"><div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Total {selectedMonth}</div><div className="mt-1 text-lg font-bold">{formatCurrency(satuanTotal + bundleTotal)}</div></div>
            <div className="p-4"><div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Satuan</div><div className="mt-1 text-lg font-bold">{formatCurrency(satuanTotal)}</div></div>
            <div className="p-4"><div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Bundle</div><div className="mt-1 text-lg font-bold">{formatCurrency(bundleTotal)}</div></div>
          </div>

          <section className="rounded-none border border-[#f0f0f0] dark:border-[#272a34]">
            <h2 className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-4 py-3 text-xs font-bold uppercase tracking-wider">Satuan · Task approved</h2>
            {rows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Belum ada task approved untuk periode ini.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                    <th className="px-4 py-2">Task</th><th className="px-4 py-2">Production</th><th className="px-4 py-2">Doctype</th>
                    <th className="px-4 py-2 text-right">Qty</th><th className="px-4 py-2 text-right">Pages</th><th className="px-4 py-2 text-right">Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 font-medium">{r.name}</td><td className="px-4 py-2.5">{r.unit}</td><td className="px-4 py-2.5">{r.doctype}</td>
                      <td className="px-4 py-2.5 text-right">{r.qty}</td><td className="px-4 py-2.5 text-right">{r.pages}</td><td className="px-4 py-2.5 text-right font-bold">{formatCurrency(r.payment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="rounded-none border border-[#f0f0f0] dark:border-[#272a34]">
            <h2 className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-4 py-3 text-xs font-bold uppercase tracking-wider">Order Bundle</h2>
            {bundleRows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Belum ada order bundle untuk periode ini.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="text-left text-[11px] uppercase tracking-wider text-gray-400">
                  <tr className="border-b border-[#f0f0f0] dark:border-[#272a34]">
                    <th className="px-4 py-2">Bundle</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Harga paket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                  {bundleRows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5 font-medium">{r.bundleName}</td>
                      <td className="px-4 py-2.5">{r.completed ? (r.inPayout ? 'Masuk payout' : 'Selesai, belum masuk payout') : 'Dalam pengerjaan'}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{formatCurrency(r.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
