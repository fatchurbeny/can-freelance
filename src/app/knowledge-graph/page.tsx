import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import CloudflareTopBar from '@/components/CloudflareTopBar';
import KnowledgeGraphViewer from '@/components/KnowledgeGraphViewer';

export const metadata = {
  title: 'Knowledge Graph & System Architecture | CAN-Freelance',
  description: 'Visualisasi Knowledge Graph, Peta Modul, Rumus Bisnis SaaS, & Log Handover Konteks Sesi.',
};

export default async function KnowledgeGraphPage() {
  const latestSyncLog = await getLatestSyncStatus();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <CloudflareTopBar badgeLabel="KNOWLEDGE GRAPH" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        {/* Sidebar navigation */}
        <Sidebar currentSyncLog={latestSyncLog} />

        {/* Main content */}
        <main className="flex-1 md:ml-56 p-6 md:p-8 space-y-6 overflow-x-hidden bg-grid-pattern">
          <KnowledgeGraphViewer />
        </main>
      </div>
    </div>
  );
}
