import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getAvailablePeriods } from '@/lib/queries';
import ProductionPageClient from '@/components/ProductionPageClient';
import { requireAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

/** Every status the board renders as a column. "Aproved" is Notion's spelling. */
const BOARD_STATUSES = [
  'QA',
  'qa',
  'Q&A',
  'q&a',
  'In QA',
  'in qa',
  'QA Process',
  'Quality Assurance',
  'Testing/QA',
  'QA/Testing',
  'In Review',
  'In review',
  'Aproved',
  'Approved',
  'Aproved-Profile Only',
  'Approved-Profile Only',
  'In Progress',
  'In progress',
  'Not Started',
  'Not started',
  'Reject',
  'reject',
  'Draft',
  'draft',
];

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function periodToTaskMonth(periodStr: string): string {
  const parts = periodStr.split('-');
  if (parts.length !== 2) return periodStr;
  const [year, month] = parts;
  const monthIdx = parseInt(month, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${INDONESIAN_MONTHS[monthIdx]}-${year}`;
  }
  return periodStr;
}

/** Privasi: nama brand/akun tidak dikirim ke role tanpa `account.view` (mis. designer freelance). */
function stripBrand<T extends { taskAccounts?: unknown; brandName?: unknown }>(task: T): T {
  return { ...task, taskAccounts: [], brandName: null };
}

/** Dropbox Link (hasil output) hanya untuk role dengan `dropboxLink.view`; Upload Link tetap. */
function stripOutput<T extends { outputUrl?: unknown }>(task: T): T {
  return { ...task, outputUrl: null };
}

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductionUnitPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const activePeriod = typeof resolvedSearchParams.period === 'string' ? resolvedSearchParams.period : '';

  const unit = await prisma.productionUnit.findUnique({ where: { slug } });
  if (!unit || !unit.isActive) notFound();
  const access = await requireAccess(['kanban.view'], unit.id);
  const canSeeBrand = access.allows('account.view', unit.id);
  const canSeeIssueTabs = access.allows('parameterIssue.view', unit.id);
  const canCreateTask = access.allows('task.create', unit.id);
  const canSeeOutput = access.allows('dropboxLink.view', unit.id);
  const canSeeInsights =
    access.allows('insights.view', unit.id) &&
    (await prisma.account.count({ where: { platformId: unit.platformId, canvaBrandId: { not: null } } })) > 0;

  const [tasks, issueTasks, latestSyncLog, periods, accounts, unresolvedEmailCount] = await Promise.all([
    prisma.task.findMany({
      where: {
        productionUnitId: unit.id,
        OR: [
          { designStatusId: null },
          { designStatus: { notionKey: { in: BOARD_STATUSES } } },
        ],
      },
      include: {
        designer: true,
        doctype: true,
        taskAccounts: { include: { account: true } },
        canvaLinks: { orderBy: { createdAt: 'asc' } },
        designStatus: true,
        comments: { select: { id: true } },
        productionUnit: { select: { platform: { select: { outputType: true } } } },
      },
      orderBy: { lastEditedTime: 'desc' },
    }),
    prisma.task.findMany({
      where: {
        productionUnitId: unit.id,
        OR: [
          { taskMonth: null },
          { poolScore: null },
        ],
      },
      include: {
        designer: true,
        doctype: true,
        designStatus: true,
        taskAccounts: { include: { account: true } },
      },
      orderBy: { createdTime: 'desc' },
    }),
    getLatestSyncStatus(),
    getAvailablePeriods(),
    prisma.account.findMany({
      where: { platformId: unit.platformId },
      orderBy: { displayName: 'asc' },
    }),
    prisma.canvaEmailNotification.count({
      where: { status: 'UNRESOLVED' },
    }),
  ]);

  const isAll = !activePeriod || activePeriod === 'all';
  const currentPeriod = isAll ? 'all' : activePeriod;
  const selectedPeriods = isAll ? periods : activePeriod.split(',').filter(Boolean);

  return (
    <ProductionPageClient
      productionUnitId={unit.id}
      productionName={unit.name}
      periods={periods}
      currentPeriod={currentPeriod}
      latestSyncLog={latestSyncLog}
      kanbanTasks={JSON.parse(JSON.stringify(tasks.map((t) => (canSeeOutput ? t : stripOutput(t))).map((t) => (canSeeBrand ? t : stripBrand(t)))))}
      issueTasks={JSON.parse(JSON.stringify(canSeeIssueTabs ? issueTasks : []))}
      selectedMonths={selectedPeriods}
      accounts={JSON.parse(JSON.stringify(canSeeBrand ? accounts : []))}
      unresolvedEmailCount={canSeeIssueTabs ? unresolvedEmailCount : 0}
      canCreateTask={canCreateTask}
      canSeeIssueTabs={canSeeIssueTabs}
      canSeeInsights={canSeeInsights}
    />
  );
}
