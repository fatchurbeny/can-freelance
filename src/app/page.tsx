import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { 
  getAvailablePeriods, 
  getDashboardData 
} from '@/lib/queries';
import { getLatestSyncStatus } from './actions/sync';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import BrandTabs from '@/components/BrandTabs';
import KPISection from '@/components/KPISection';
import TrenVolumeWidget from '@/components/TrenVolumeWidget';
import DistribusiWidget from '@/components/DistribusiWidget';
import PipelineWidget from '@/components/PipelineWidget';
import DoctypeWidget from '@/components/DoctypeWidget';
import { LisensiGauge, BahasaGauge } from '@/components/GaugesWidget';
import WorkloadWidget from '@/components/WorkloadWidget';
import ApprovedProfileOnlyWidget from '@/components/ApprovedProfileOnlyWidget';
import LeaderboardWidget from '@/components/LeaderboardWidget';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  // Await searchParams as required in Next.js 15+
  const resolvedSearchParams = await searchParams;
  
  // Extract and sanitize active filters
  const activeBrand = typeof resolvedSearchParams.brand === 'string' ? resolvedSearchParams.brand : 'Semua Brand';
  const activePeriod = typeof resolvedSearchParams.period === 'string' ? resolvedSearchParams.period : null;

  // 1. Fetch metadata & filter options from DB
  const periods = await getAvailablePeriods();
  const accounts = await prisma.account.findMany({
    orderBy: { displayName: 'asc' }
  });
  const brandsList = accounts.map((acc) => acc.displayName);

  // Default to the first available period if none selected
  const defaultPeriod = periods[0] || new Date().toISOString().substring(0, 7);
  const selectedPeriod = activePeriod || defaultPeriod;

  // 2. Fetch full dashboard statistics via queries
  const dashboardData = await getDashboardData({
    brandName: activeBrand,
    selectedPeriod: selectedPeriod,
  });

  // 3. Fetch latest sync log for status display
  const latestSyncLog = await getLatestSyncStatus();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F5F0EB] dark:bg-[#0a0b0e] text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sidebar navigation */}
      <Sidebar currentSyncLog={latestSyncLog} />

      {/* Main dashboard content */}
      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-x-hidden">
        {/* Header toolbar */}
        <Header 
          periods={periods} 
          currentPeriod={selectedPeriod} 
        />

        {/* Brand filter tabs */}
        <div className="py-2 overflow-x-auto scrollbar-none">
          <Suspense fallback={<div className="h-[44px] bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />}>
            <BrandTabs 
              brands={brandsList} 
              currentBrand={activeBrand} 
            />
          </Suspense>
        </div>

        {/* Top summary KPI Cards */}
        <KPISection kpi={dashboardData.kpi} selectedPeriod={selectedPeriod} />

        {/* Visual Charts & Tables Grid Layout */}
        <div className="space-y-6">
          {/* Row 1: Tren Volume (1/2) & Distribusi (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <TrenVolumeWidget 
                data={dashboardData.widgets.trenVolume} 
                brandName={activeBrand} 
              />
            </div>
            <div>
              <ResponsiveWrapper>
                <DistribusiWidget 
                  data={dashboardData.widgets.distribusiTemplate} 
                  brandName={activeBrand} 
                />
              </ResponsiveWrapper>
            </div>
          </div>

          {/* Row 2: Pipeline (1/2) & Kategori Doctype (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PipelineWidget 
              data={dashboardData.widgets.taskPipeline} 
              inQueue={dashboardData.widgets.inQueue} 
              brandName={activeBrand} 
            />
            <DoctypeWidget 
              data={dashboardData.widgets.kategoriDoctype} 
              totalDoctypes={dashboardData.kpi.totalDoctypes} 
              brandName={activeBrand} 
            />
          </div>

          {/* Row 3: Lisensi Gauge (1/4), Bahasa Gauge (1/4), & Approved-Profile Only (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <LisensiGauge 
                data={dashboardData.widgets.lisensiTemplate} 
                brandName={activeBrand} 
              />
            </div>
            <div className="lg:col-span-1">
              <BahasaGauge 
                data={dashboardData.widgets.bahasaTemplate} 
                brandName={activeBrand} 
              />
            </div>
            <div className="lg:col-span-2">
              <ApprovedProfileOnlyWidget 
                data={dashboardData.widgets.approvedProfileOnlyTable} 
                brandName={activeBrand} 
              />
            </div>
          </div>

          {/* Row 4: Designer Leaderboard (1/2) & Workload (1/2) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeaderboardWidget 
              data={dashboardData.widgets.leaderboard} 
              columns={dashboardData.widgets.leaderboardCols}
              topPerformer={dashboardData.widgets.topPerformer} 
              brandName={activeBrand} 
            />
            <WorkloadWidget 
              data={dashboardData.widgets.workloadPerDesigner} 
              brandName={activeBrand} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Simple wrapper for client component visual hydration safety
function ResponsiveWrapper({ children }: { children: React.ReactNode }) {
  return <div className="w-full h-full">{children}</div>;
}
