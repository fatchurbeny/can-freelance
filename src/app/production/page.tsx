import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getAvailablePeriods } from '@/lib/queries';
import ProductionPageClient from '@/components/ProductionPageClient';

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

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductionPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const activePeriod = typeof resolvedSearchParams.period === 'string' ? resolvedSearchParams.period : '';

  const [tasks, issueTasks, latestSyncLog, periods] = await Promise.all([
    prisma.task.findMany({
      where: {
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
      },
      orderBy: { lastEditedTime: 'desc' },
    }),
    prisma.task.findMany({
      where: {
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
  ]);

  const isAll = !activePeriod || activePeriod === 'all' || activePeriod.split(',').length >= periods.length;
  const currentPeriod = isAll ? 'all' : activePeriod;
  const selectedPeriods = isAll ? periods : activePeriod.split(',').filter(Boolean);

  return (
    <ProductionPageClient
      periods={periods}
      currentPeriod={currentPeriod}
      latestSyncLog={latestSyncLog}
      kanbanTasks={JSON.parse(JSON.stringify(tasks))}
      issueTasks={JSON.parse(JSON.stringify(issueTasks))}
      selectedMonths={selectedPeriods}
    />
  );
}
