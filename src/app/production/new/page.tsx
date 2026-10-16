import { requireAccess } from '@/lib/access';
import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import ProductionWizard from '@/components/production-wizard/ProductionWizard';

export const dynamic = 'force-dynamic';

export default async function NewProductionPage() {
  await requireAccess(['production.create']);
  const [platforms, latestSyncLog] = await Promise.all([
    prisma.platform.findMany({ orderBy: { createdAt: 'asc' } }),
    getLatestSyncStatus(),
  ]);

  return (
    <ProductionWizard
      platforms={JSON.parse(JSON.stringify(platforms))}
      latestSyncLog={latestSyncLog}
    />
  );
}
