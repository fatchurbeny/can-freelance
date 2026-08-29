import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import SortableTaskLists from '@/components/SortableTaskLists';

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

export default async function ProductionPage() {
  const [tasks, latestSyncLog] = await Promise.all([
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
    getLatestSyncStatus(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F0EB] text-gray-900 transition-colors dark:bg-[#0a0b0e] dark:text-gray-100 md:flex-row">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 p-6 md:p-8">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[#E8E0D8] pb-4 dark:border-gray-800 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Production</h1>
          </div>
        </div>

        {tasks.length > 0 ? (
          <SortableTaskLists tasks={JSON.parse(JSON.stringify(tasks))} />
        ) : (
          <div className="rounded-xl border border-dashed border-[#E8E0D8] px-6 py-16 text-center dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">No tasks found</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No tasks are currently in the production pipeline.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
