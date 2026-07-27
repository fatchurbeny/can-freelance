import prisma from '@/lib/prisma';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { getLatestSyncStatus } from '@/app/actions/sync';
import SortableTaskLists from '@/components/SortableTaskLists';

export default async function ProductionPage() {
  const [tasks, latestSyncLog] = await Promise.all([
    prisma.task.findMany({
      where: {
        designStatus: { notionKey: { in: ['QA', 'Draft', 'In Progress', 'Not Started'] } },
      },
      include: {
        designer: true,
        doctype: true,
        taskAccounts: { include: { account: true } },
        canvaLinks: { orderBy: { createdAt: 'asc' } },
        designStatus: true,
      },
      orderBy: { lastEditedTime: 'desc' },
    }),
    getLatestSyncStatus(),
  ]);

  const reviewTaskCount = tasks.filter((task) => task.designStatus?.notionKey === 'QA').length;
  const progressTaskCount = tasks.filter((t) => ['In Progress', 'Not Started'].includes(t.designStatus?.notionKey ?? '')).length;
  const draftTaskCount = tasks.filter((t) => t.designStatus?.notionKey === 'Draft').length;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F0EB] text-gray-900 transition-colors dark:bg-[#0a0b0e] dark:text-gray-100 md:flex-row">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex-1 space-y-8 overflow-x-hidden p-6 md:p-8">
        <div className="flex flex-col items-start justify-between gap-4 border-b border-[#E8E0D8] pb-4 dark:border-gray-800 md:flex-row md:items-center">
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
              Production
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {reviewTaskCount} task{reviewTaskCount !== 1 ? 's' : ''} need review · {progressTaskCount} task{progressTaskCount !== 1 ? 's' : ''} in progress · {draftTaskCount} task{draftTaskCount !== 1 ? 's' : ''} in draft
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-medium text-white shadow-sm">
              IS
            </div>
          </div>
        </div>

        {tasks.length > 0 ? (
          <SortableTaskLists tasks={JSON.parse(JSON.stringify(tasks))} />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-24 text-center dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">No tasks are currently in the production pipeline.</p>
          </div>
        )}
      </main>
    </div>
  );
}
