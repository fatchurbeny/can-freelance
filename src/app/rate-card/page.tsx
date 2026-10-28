import { requireAccess } from '@/lib/access';
import { getDoctypes } from '@/lib/queries';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';
import TopBar from '@/components/TopBar';
import { Gavel, Calendar } from 'lucide-react';
import DoctypeTable from '@/components/DoctypeTable';
import prisma from '@/lib/prisma';
import { listPlatformsAction } from '@/app/actions/production-unit';
import ContractRateEditor from '@/components/ContractRateEditor';

export const dynamic = 'force-dynamic';

export default async function RateCardPage({ searchParams }: { searchParams: Promise<{ tab?: string; new?: string; from?: string }> }) {
  const access = await requireAccess(['rateCard.view']);
  const params = await searchParams;
  const initialTab = params.tab === 'kontrak' || params.tab === 'bundle' ? params.tab : 'doctype';
  // Dari wizard production: langsung buka Kontrak Baru (bila boleh edit), lalu kembali ke wizard
  const openNewContract = initialTab === 'kontrak' && params.new === '1' && access.allows('rateCard.edit');
  const doctypes = await getDoctypes();
  const platforms = await listPlatformsAction();
  const [bundles, bundleUnits, bundleDoctypes] = await Promise.all([
    prisma.bundle.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        items: {
          orderBy: { sortOrder: 'asc' },
          include: { productionUnit: { include: { platform: true } }, doctype: { select: { displayName: true } } },
        },
      },
    }),
    prisma.productionUnit.findMany({ where: { isActive: true }, select: { id: true, name: true, platformId: true }, orderBy: { createdAt: 'asc' } }),
    prisma.doctype.findMany({ where: { isActive: true, usage: { in: ['Bundle', 'Keduanya'] } }, select: { id: true, displayName: true, platformId: true, pages: true }, orderBy: { displayName: 'asc' } }),
  ]);
  const latestSyncLog = await getLatestSyncStatus();
  const contractRateRes = await getContractRateAction();
  const contractRate = contractRateRes.success ? contractRateRes.contractRate : 15000;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="RATE CARD" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col p-3 sm:p-6 md:p-8 bg-grid-pattern">
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
                <div className="flex items-center gap-2.5 px-3.5 sm:px-6 py-3 sm:py-4 bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300 min-w-0">
                  <Calendar className="w-4 h-4 text-[#ff5e1f] shrink-0 self-start sm:self-center mt-0.5 sm:mt-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-sans font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Kalender:
                    </span>
                    <strong className="text-xs sm:text-xs font-bold text-gray-900 dark:text-white truncate">
                      25 Hari Kerja/Bulan
                    </strong>
                  </div>
                </div>

                {/* Cell 2: Rate/Pool Editor Button */}
                <ContractRateEditor initialRate={contractRate ?? 15000} />
              </div>
            </div>
          </div>

          {/* Bottom Block Container: Continuous Card for Tabs + Toolbar + Table */}
          <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
            <DoctypeTable doctypes={doctypes as any} contractRate={contractRate ?? 15000} platforms={platforms}
              initialTab={initialTab} openNewContract={openNewContract} returnToWizard={params.from === 'wizard'}
              bundles={JSON.parse(JSON.stringify(bundles))} bundleUnits={bundleUnits} bundleDoctypes={bundleDoctypes} />
          </div>
        </main>
      </div>
    </div>
  );
}
