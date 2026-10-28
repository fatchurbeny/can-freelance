'use client';

import { useState } from 'react';
import TopBar from './TopBar';
import ProductionView from './ProductionView';

interface Props {
  productionUnitId: string;
  productionName?: string;
  periods: string[];
  currentPeriod: string;
  latestSyncLog: any;
  kanbanTasks: any[];
  issueTasks: any[];
  selectedMonths: string[];
  accounts?: any[];
  unresolvedEmailCount?: number;
  canCreateTask?: boolean;
  canSeeIssueTabs?: boolean;
  canSeeInsights?: boolean;
}

export default function ProductionPageClient({
  productionUnitId,
  productionName,
  periods,
  currentPeriod,
  latestSyncLog,
  kanbanTasks,
  issueTasks,
  selectedMonths,
  accounts = [],
  unresolvedEmailCount = 0,
  canCreateTask = true,
  canSeeIssueTabs = true,
  canSeeInsights = false,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar
        badgeLabel="PRODUCTION"
        breadcrumb={productionName ? [{ label: 'Production', href: '/production' }, { label: productionName }] : undefined}
        periods={periods}
        currentPeriod={currentPeriod}
        createTaskAction={canCreateTask ? {
          label: 'Add New Task',
          onClick: () => setCreateOpen(true),
        } : undefined}
      />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-4 p-3 sm:p-6 md:p-8 bg-grid-pattern">
          <ProductionView
            productionUnitId={productionUnitId}
            kanbanTasks={kanbanTasks}
            issueTasks={issueTasks}
            selectedMonths={selectedMonths}
            accounts={accounts}
            unresolvedEmailCount={unresolvedEmailCount}
            canCreateTask={canCreateTask}
            canSeeIssueTabs={canSeeIssueTabs}
            canSeeInsights={canSeeInsights}
          />
        </main>
      </div>
    </div>
  );
}
