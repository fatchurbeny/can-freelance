'use client';

import { useState } from 'react';
import TopBar from './TopBar';
import Sidebar from './Sidebar';
import ProductionView from './ProductionView';

interface Props {
  periods: string[];
  currentPeriod: string;
  latestSyncLog: any;
  kanbanTasks: any[];
  issueTasks: any[];
  selectedMonths: string[];
}

export default function ProductionPageClient({
  periods,
  currentPeriod,
  latestSyncLog,
  kanbanTasks,
  issueTasks,
  selectedMonths,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar
        badgeLabel="PRODUCTION"
        periods={periods}
        currentPeriod={currentPeriod}
        createTaskAction={{
          label: 'Add New Task',
          onClick: () => setCreateOpen(true),
        }}
      />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-4 p-6 md:p-8 bg-grid-pattern">
          <ProductionView
            kanbanTasks={kanbanTasks}
            issueTasks={issueTasks}
            selectedMonths={selectedMonths}
          />
        </main>
      </div>
    </div>
  );
}
