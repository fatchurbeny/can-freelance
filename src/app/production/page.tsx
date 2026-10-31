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

  // Designer per production = designer yang punya task di production itu (urut jumlah task).
  // Doctype per production = doctype aktif platform-nya.
  const [designerGroups, doctypes] = await Promise.all([
    prisma.task.groupBy({
      by: ['productionUnitId', 'designerId'],
      where: { designerId: { not: null } },
      _count: { _all: true },
    }),
    prisma.doctype.findMany({
      where: { isActive: true },
      select: { platformId: true, displayName: true },
      orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
    }),
  ]);
  const designerIds = [...new Set(designerGroups.map((g) => g.designerId!))];
  const designers = await prisma.designer.findMany({ where: { id: { in: designerIds } }, select: { id: true, displayName: true } });
  const designerName = new Map(designers.map((d) => [d.id, d.displayName]));

  const unitRows = units.map((unit) => ({
    ...unit,
    designers: designerGroups
      .filter((g) => g.productionUnitId === unit.id)
      .sort((x, y) => y._count._all - x._count._all)
      .map((g) => designerName.get(g.designerId!))
      .filter((name): name is string => !!name),
    doctypes: doctypes.filter((d) => d.platformId === unit.platformId).map((d) => d.displayName),
  }));

  const latestSyncLog = await getLatestSyncStatus();

  return (
    <ProductionHubClient
      units={JSON.parse(JSON.stringify(unitRows))}
      latestSyncLog={latestSyncLog}
    />
  );
}
