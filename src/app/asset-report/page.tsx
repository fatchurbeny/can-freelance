import TopBar from '@/components/TopBar';
import AssetReportClient from '@/components/asset-report/AssetReportClient';
import { requireAccess } from '@/lib/access';
import { canvaProductionUnits } from '@/lib/asset-library';
import { loadAssetReport } from '@/lib/asset-report';

export const dynamic = 'force-dynamic';

const PERIODS = new Set(['30', '90', 'all']);

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Asset Report: pemakaian aset Asset Library di brief dan status template hasilnya. */
export default async function AssetReportPage({ searchParams }: PageProps) {
  const access = await requireAccess(['asset.manage']);
  const params = await searchParams;
  const one = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : null);

  const categoryId = one('category');
  const productionUnitId = one('production');
  const period = PERIODS.has(one('days') ?? '') ? one('days')! : '30';
  const days = period === 'all' ? null : Number(period);

  const [report, units] = await Promise.all([
    loadAssetReport({ categoryId, productionUnitId, days, unitIds: access.unitIds }),
    canvaProductionUnits(access.unitIds),
  ]);

  return (
    <div className="min-h-screen bg-white text-[#262626] dark:bg-[#0d0e12] dark:text-[#f4f4f5]">
      <TopBar badgeLabel={report.category ? `ASSET REPORT · ${report.category.name.toUpperCase()}` : 'ASSET REPORT · SEMUA ASET'} />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex-1 overflow-x-hidden bg-grid-pattern p-3 sm:p-6 md:ml-56 md:p-8">
          <AssetReportClient
            report={JSON.parse(JSON.stringify(report))}
            units={units}
            filters={{ categoryId, productionUnitId, period, days }}
          />
        </main>
      </div>
    </div>
  );
}
