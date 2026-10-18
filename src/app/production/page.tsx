import { requireAccess } from '@/lib/access';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import ProductionHubClient from '@/components/ProductionHubClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductionHubPage({ searchParams }: PageProps) {
  await requireAccess(['production.create']);
  const params = await searchParams;

  const units = await prisma.productionUnit.findMany({
    include: { platform: true, _count: { select: { tasks: true } } },
    orderBy: { createdAt: 'asc' },
  });

  // Bookmark lama `/production?period=…` dialihkan ke unit pertama, membawa query-nya.
  const legacyQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') legacyQuery.set(key, value);
  }
  const activeUnits = units.filter((u) => u.isActive);
  if (activeUnits.length > 0 && legacyQuery.toString()) {
    redirect(`/production/${activeUnits[0].slug}?${legacyQuery.toString()}`);
  }

  const latestSyncLog = await getLatestSyncStatus();

  return (
    <ProductionHubClient
      units={JSON.parse(JSON.stringify(units))}
      latestSyncLog={latestSyncLog}
    />
  );
}
