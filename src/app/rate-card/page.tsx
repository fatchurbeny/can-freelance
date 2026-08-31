import { getDoctypes } from '@/lib/queries';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';
import Sidebar from '@/components/Sidebar';
import CloudflareTopBar from '@/components/CloudflareTopBar';
import { Gavel, Calendar } from 'lucide-react';
import DoctypeTable from '@/components/DoctypeTable';
import ContractRateEditor from '@/components/ContractRateEditor';

import AddDoctypeButton from '@/components/AddDoctypeButton';

export const dynamic = 'force-dynamic';

export default async function RateCardPage() {
  const doctypes = await getDoctypes();
  const latestSyncLog = await getLatestSyncStatus();
  const contractRateRes = await getContractRateAction();
  const contractRate = contractRateRes.success ? contractRateRes.contractRate : 15000;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <CloudflareTopBar badgeLabel="RATE CARD" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col p-6 md:p-8 bg-grid-pattern">

          {/* Single Continuous Outer Container */}
          <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
            <DoctypeTable doctypes={doctypes} contractRate={contractRate ?? 15000} />
          </div>
        </main>
      </div>
    </div>
  );
}
