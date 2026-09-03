import { getDoctypes } from '@/lib/queries';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { Gavel, Calendar } from 'lucide-react';
import DoctypeTable from '@/components/DoctypeTable';
import ContractRateEditor from '@/components/ContractRateEditor';

export const dynamic = 'force-dynamic';

export default async function RateCardPage() {
  const doctypes = await getDoctypes();
  const latestSyncLog = await getLatestSyncStatus();
  const contractRateRes = await getContractRateAction();
  const contractRate = contractRateRes.success ? contractRateRes.contractRate : 15000;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="RATE CARD" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col p-6 md:p-8 bg-grid-pattern">
          {/* Top Block Container: Contract Rules Banner (Image 1 Style) */}
          <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none mb-6">
            <div className="flex flex-col md:flex-row items-stretch justify-between bg-gray-50/50 dark:bg-[#0d0e12]">
              {/* Left Title Cell */}
              <div className="flex items-center gap-3 p-4 sm:p-5 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center shrink-0">
                  <Gavel className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-sans font-bold text-sm text-gray-900 dark:text-white capitalize truncate">
                    Ketentuan & Aturan Kontrak Freelance
                  </h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 font-sans mt-0.5 truncate">
                    Kontrak dimulai sejak 26 Januari 2026
                  </p>
                </div>
              </div>

              {/* Right Full-Height Table Cells */}
              <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] border-t md:border-t-0 md:border-l border-[#f0f0f0] dark:border-[#272a34] shrink-0 font-sans text-xs">
                {/* Cell 1: Kalender */}
                <div className="flex items-center gap-2.5 px-5 sm:px-6 py-4 bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 text-[#ff5e1f] shrink-0" />
                  <span className="whitespace-nowrap">
                    Kalender: <strong className="font-bold text-gray-900 dark:text-white">25 Hari Kerja/Bulan</strong>
                  </span>
                </div>

                {/* Cell 2: Rate/Pool Editor Button */}
                <ContractRateEditor initialRate={contractRate ?? 15000} />
              </div>
            </div>
          </div>

          {/* Bottom Block Container: Continuous Card for Tabs + Toolbar + Table */}
          <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
            <DoctypeTable doctypes={doctypes as any} contractRate={contractRate ?? 15000} />
          </div>
        </main>
      </div>
    </div>
  );
}
