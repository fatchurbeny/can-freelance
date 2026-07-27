import { getDoctypes } from '@/lib/queries';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
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
    <div className="flex min-h-screen flex-col bg-[#F5F0EB] text-gray-900 transition-colors dark:bg-[#0a0b0e] dark:text-gray-100 md:flex-row">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex-1 space-y-8 overflow-x-hidden p-6 md:p-8">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[#E8E0D8] pb-4 dark:border-gray-800 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              Rate Card Configurations
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Atur doctype, pool rate, pages, dan ketentuan kontrak freelance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-medium text-white shadow-sm">
              IS
            </div>
          </div>
        </div>

        <div className="glass flex flex-col gap-4 rounded-xl border border-[#E8E0D8] p-4 shadow-sm dark:border-gray-800 dark:bg-[#111827] md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="shrink-0 rounded-lg bg-indigo-600 p-2.5 text-white">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Ketentuan & aturan kontrak freelance
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                kontrak dimulai sejak 26 januari 2026
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 text-indigo-500" />
              <span>
                Kalender : <strong className="font-semibold text-gray-900 dark:text-white">25 hari kerja/bulan</strong>
              </span>
            </div>
            <ContractRateEditor initialRate={contractRate ?? 15000} />
          </div>
        </div>

        <DoctypeTable doctypes={doctypes} contractRate={contractRate ?? 15000} />
      </main>
    </div>
  );
}
