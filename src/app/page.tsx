import { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { 
  getAvailablePeriods, 
  getDashboardData 
} from '@/lib/queries';
import { getLatestSyncStatus } from './actions/sync';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import CloudflareTopBar from '@/components/CloudflareTopBar';
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
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      {/* Top Global Cloudflare Title Bar */}
      <CloudflareTopBar badgeLabel="DASHBOARD" periods={periods} currentPeriod={selectedPeriod} />

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-56px)]">
        {/* Sidebar navigation */}
        <Sidebar currentSyncLog={latestSyncLog} />

        {/* Main dashboard content */}
        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col p-6 md:p-8 bg-grid-pattern">

          {/* Single Continuous Outer Container (Gabung Semua Baris/Card) */}
          <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
            
            {/* Block 0: Brand Tabs */}
            <Suspense fallback={<div className="h-[44px] bg-gray-100 dark:bg-gray-800 animate-pulse" />}>
              <BrandTabs 
                brands={brandsList} 
                currentBrand={activeBrand} 
              />
            </Suspense>

            {/* Block 1: KPI Cards */}
            <KPISection kpi={dashboardData.kpi} selectedPeriod={selectedPeriod} />

            {/* Row 1: Tren Volume (1/2) & Distribusi (1/2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              <TrenVolumeWidget 
                data={dashboardData.widgets.trenVolume} 
                brandName={activeBrand} 
              />
              <DistribusiWidget 
                data={dashboardData.widgets.distribusiTemplate} 
                brandName={activeBrand} 
              />
            </div>

            {/* Row 2: Pipeline (1/2) & Kategori Doctype (1/2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
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

            {/* Row 3: Gauges (20%) + Beban Kerja per Designer (30%) + Approved-Profile Only Table (50%) */}
            <div className="grid grid-cols-1 lg:grid-cols-10 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
              {/* 1. Stacked Gauges (20%) */}
              <div className="lg:col-span-2 flex flex-col divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                <LisensiGauge 
                  data={dashboardData.widgets.lisensiTemplate} 
                  brandName={activeBrand} 
                />
                <BahasaGauge 
                  data={dashboardData.widgets.bahasaTemplate} 
                  brandName={activeBrand} 
                />
              </div>

              {/* 2. Beban Kerja per Designer (30%) */}
              <div className="lg:col-span-3">
                <WorkloadWidget 
                  data={dashboardData.widgets.workloadPerDesigner} 
                  brandName={activeBrand} 
                />
              </div>

              {/* 3. Approved Profile Only Table (50%) */}
              <div className="lg:col-span-5">
                <ApprovedProfileOnlyWidget 
                  data={dashboardData.widgets.approvedProfileOnlyTable} 
                  brandName={activeBrand} 
                />
              </div>
            </div>

            {/* Row 4: Designer Leaderboard (Full Width) */}
            <div>
              <LeaderboardWidget 
                data={dashboardData.widgets.leaderboard} 
                columns={dashboardData.widgets.leaderboardCols}
                topPerformer={dashboardData.widgets.topPerformer} 
                brandName={activeBrand} 
              />
            </div>

          </div>
        </main>
    </div>
  </div>
  );
}

// Simple wrapper for client component visual hydration safety
function ResponsiveWrapper({ children }: { children: React.ReactNode }) {
  return <div className="w-full h-full">{children}</div>;
}
