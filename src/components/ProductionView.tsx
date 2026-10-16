'use client';

import { useState } from 'react';
import ProductionTabNav, { ProductionTab } from './ProductionTabNav';
import ProductionOverview from './ProductionOverview';
import SortableTaskLists from './SortableTaskLists';
import ParameterIssueTable from './ParameterIssueTable';
import EmailNotificationView from './EmailNotificationView';
import { useRouter } from 'next/navigation';
import CreateTaskSlideModal from './CreateTaskSlideModal';

interface Props {
  productionUnitId: string;
  kanbanTasks: any[];
  issueTasks: any[];
  selectedMonths?: string[];
  accounts?: any[];
  unresolvedEmailCount?: number;
  onCreateTask?: () => void;
  canCreateTask?: boolean;
  /** false = sembunyikan tab Parameter Issue & Email Notifications. */
  canSeeIssueTabs?: boolean;
}

export default function ProductionView({
  productionUnitId,
  kanbanTasks,
  issueTasks,
  selectedMonths,
  accounts = [],
  unresolvedEmailCount = 0,
  canCreateTask = true,
  canSeeIssueTabs = true,
}: Props) {
  const [activeTab, setActiveTab] = useState<ProductionTab>(canSeeIssueTabs ? 'overview' : 'kanban');
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  const handleTaskCreated = () => {
    setActiveTab('kanban');
    router.refresh();
  };

  return (
    <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
      <ProductionTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issueCount={issueTasks.length}
        emailIssueCount={unresolvedEmailCount}
        hiddenTabs={canSeeIssueTabs ? [] : ['parameterIssue', 'emailNotification']}
      />

      {activeTab === 'overview' && (
        <ProductionOverview tasks={kanbanTasks} selectedMonths={selectedMonths} />
      )}

      {activeTab === 'kanban' && (
        <SortableTaskLists tasks={kanbanTasks} selectedMonths={selectedMonths} onCreateTask={canCreateTask ? () => setCreateOpen(true) : undefined} />
      )}

      {canSeeIssueTabs && activeTab === 'parameterIssue' && (
        <ParameterIssueTable initialTasks={issueTasks} onParametersUpdated={handleRefresh} />
      )}

      {canSeeIssueTabs && activeTab === 'emailNotification' && (
        <EmailNotificationView accounts={accounts} />
      )}

      <CreateTaskSlideModal productionUnitId={productionUnitId} open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleTaskCreated} />
    </div>
  );
}
