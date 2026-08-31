import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import CloudflareTopBar from '@/components/CloudflareTopBar';
import ProductionView from '@/components/ProductionView';
import { getAvailablePeriods } from '@/lib/queries';

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
      where: { designStatus: { notionKey: { in: BOARD_STATUSES } } },
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

  const currentPeriod = activePeriod || (periods[0] ?? '');
  const selectedPeriods = currentPeriod
    ? currentPeriod.split(',').filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <CloudflareTopBar badgeLabel="PRODUCTION" periods={periods} currentPeriod={currentPeriod} />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-4 p-6 md:p-8 bg-grid-pattern">
          <ProductionView
            kanbanTasks={JSON.parse(JSON.stringify(tasks))}
            issueTasks={JSON.parse(JSON.stringify(issueTasks))}
            selectedMonths={selectedPeriods}
          />
        </main>
    </div>
  </div>
  );
}
