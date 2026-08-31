'use client';

import { useState } from 'react';
import ProductionTabNav, { ProductionTab } from './ProductionTabNav';
import ProductionOverview from './ProductionOverview';
import SortableTaskLists from './SortableTaskLists';
import ParameterIssueTable from './ParameterIssueTable';
import { useRouter } from 'next/navigation';

interface Props {
  kanbanTasks: any[];
  issueTasks: any[];
  selectedMonths?: string[];
}

export default function ProductionView({ kanbanTasks, issueTasks, selectedMonths }: Props) {
  const [activeTab, setActiveTab] = useState<ProductionTab>('overview');
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
      <ProductionTabNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        issueCount={issueTasks.length}
      />

      {activeTab === 'overview' && (
        <ProductionOverview tasks={kanbanTasks} selectedMonths={selectedMonths} />
      )}

      {activeTab === 'kanban' && (
        <SortableTaskLists tasks={kanbanTasks} selectedMonths={selectedMonths} />
      )}

      {activeTab === 'parameterIssue' && (
        <ParameterIssueTable initialTasks={issueTasks} onParametersUpdated={handleRefresh} />
      )}
    </div>
  );
}
