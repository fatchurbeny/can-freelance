import { Suspense } from 'react';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer';

export const metadata = {
  title: 'Knowledge Graph & System Architecture | CAN-Freelance',
  description: 'Visualisasi Knowledge Graph, Peta Modul, Rumus Bisnis SaaS, & Log Handover Konteks Sesi.',
};

export default async function KnowledgeGraphPage() {
  const latestSyncLog = await getLatestSyncStatus();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="KNOWLEDGE GRAPH" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        {/* Sidebar navigation */}
        <Suspense fallback={<div className="w-56 shrink-0 bg-white dark:bg-[#0d0e12]" />}>
          <Sidebar currentSyncLog={latestSyncLog} />
        </Suspense>

        {/* Main content */}
        <main className="flex-1 md:ml-56 p-6 md:p-8 space-y-6 overflow-x-hidden bg-grid-pattern">
          <Suspense fallback={<div className="p-6 font-mono text-xs text-gray-500">Loading Knowledge Graph...</div>}>
            <KnowledgeGraphViewer />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
