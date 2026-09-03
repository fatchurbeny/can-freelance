import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';

export const dynamic = 'force-dynamic';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import DesignerStatusSelect from '@/components/DesignerStatusSelect';
import AddTeamAccountButton from '@/components/AddTeamAccountButton';
import DesignerTableRowActions from '@/components/DesignerTableRowActions';
import DesignerTableBody from '@/components/DesignerTableBody';
import AccountTeamSection from '@/components/AccountTeamSection';
import { Gavel, Trophy, CircleDot, Plus, Award } from 'lucide-react';

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

function getBrandColor(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes('antler')) return 'text-[#fae48c]';
  if (normalized.includes('zahra')) return 'text-[#3ecf8e]';
  if (normalized.includes('chital')) return 'text-[#ec4899]';
  if (normalized.includes('ui creative') || normalized.includes('uicreative')) return 'text-[#6646b1]';
  if (normalized.includes('teman siswa') || normalized.includes('temansiswa')) return 'text-white';
  if (normalized.includes('improstd')) return 'text-[#f0a848]';
  return 'text-pink-500 dark:text-[#ec4899]';
}

export default async function AccountTeamPage() {
  const latestSyncLog = await getLatestSyncStatus();
  const contractRateRes = await getContractRateAction();
  const contractRate = contractRateRes.success ? contractRateRes.contractRate : 15000;

  const designersData = await prisma.designer.findMany({
    include: {
      tasks: {
        include: { designStatus: true, doctype: true }
      }
    }
  });

  const designers = designersData.map(d => {
    const approvedTasks = d.tasks.filter(t => t.designStatus?.countsAsApproved);
    const approved = approvedTasks.length;
    const templates = d.tasks.reduce((acc, t) => acc + Number(t.qtySubmit || 0), 0);
    const pages = d.tasks.reduce((acc, t) => acc + (Number(t.qtySubmit || 0) * Number(t.pages || 0)), 0);

    // Calculate Top 3 Doctypes (Specializations) based on approved tasks count
    const doctypeCounts: Record<string, number> = {};
    approvedTasks.forEach(t => {
      const name = t.doctype?.displayName || 'Other';
      doctypeCounts[name] = (doctypeCounts[name] || 0) + 1;
    });

    const topDoctypes = Object.entries(doctypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    const specializationText = topDoctypes.length > 0 ? topDoctypes.join(', ') : '—';

    return {
      ...d,
      approved,
      templates,
      pages,
      specializations: topDoctypes,
      specializationText,
    };
  }).sort((a, b) => {
    if (a.status !== 'Active' && b.status === 'Active') return 1;
    if (a.status === 'Active' && b.status !== 'Active') return -1;
    return b.approved - a.approved;
  });

  const accountsData = await prisma.account.findMany({
    include: {
      taskAccounts: {
        include: { task: true }
      }
    }
  });

  const accounts = accountsData.map(a => {
    const tasks = a.taskAccounts.map(ta => ta.task);
    const doctypes = new Set(tasks.map(t => t.doctypeId).filter(Boolean)).size;
    const templates = tasks.reduce((acc, t) => acc + Number(t.qtySubmit || 0), 0);
    const pages = tasks.reduce((acc, t) => acc + (Number(t.qtySubmit || 0) * Number(t.pages || 0)), 0);
    return { ...a, doctypes, templates, pages };
  }).sort((a, b) => b.doctypes - a.doctypes);

  const totalMembers = designers.length + accounts.length;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="ACCOUNT & TEAM" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex-1 md:ml-56 p-6 md:p-8 space-y-8 overflow-x-hidden bg-grid-pattern">


        {/* Separate Container 1: Contract Rules Banner */}
        <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] shadow-none">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12]">
            {/* Left Title Cell (Column 1 - 50%) */}
            <div className="flex items-center gap-3 p-4 sm:p-5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-bold text-sm text-gray-900 dark:text-white capitalize truncate">
                  Ketentuan & Aturan Kontrak Freelance
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-sans mt-0.5 truncate">
                  Kontrak dimulai sejak 26 Januari 2026
                </p>
              </div>
            </div>

            {/* Right Full-Height Table Cells (Column 2 - 50%) */}
            <div className="flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34] font-sans text-xs min-w-0">
              <div className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300">
                <CircleDot className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
                <span className="whitespace-nowrap">Kalender: <strong className="font-bold text-gray-900 dark:text-white">25 Hari Kerja/Bulan</strong></span>
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 px-4 py-4 bg-white dark:bg-[#0d0e12] text-gray-700 dark:text-gray-300">
                <CircleDot className="w-3.5 h-3.5 text-[#ff5e1f] shrink-0" />
                <span className="whitespace-nowrap">Rate/Pool: <strong className="font-bold text-gray-900 dark:text-white">IDR {contractRate!.toLocaleString('id-ID')}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Separate Container 2: 2 Tabs Layout Container (Designer Team vs Canva Accounts) */}
        <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
          <AccountTeamSection
            designers={designers.map((d) => ({
              id: d.id,
              displayName: d.displayName,
              role: d.role,
              status: d.status,
              contractType: d.contractType,
              contractStartDate: d.contractStartDate ? new Date(d.contractStartDate).toISOString() : null,
              probationEndDate: d.probationEndDate ? new Date(d.probationEndDate).toISOString() : null,
              inactiveStartDate: d.inactiveStartDate ? new Date(d.inactiveStartDate).toISOString() : null,
              inactiveNote: d.inactiveNote,
              resignDate: d.resignDate ? new Date(d.resignDate).toISOString() : null,
              promotionDate: d.promotionDate ? new Date(d.promotionDate).toISOString() : null,
              email: d.email,
              phone: d.phone,
              bankName: d.bankName,
              bankAccount: d.bankAccount,
              approved: d.approved,
              templates: d.templates,
              pages: d.pages,
              specializations: d.specializations,
              specializationText: d.specializationText,
            }))}
            accounts={accounts.map((a) => ({
              id: a.id,
              displayName: a.displayName,
              color: a.color,
              notionKey: a.notionKey,
              doctypes: a.doctypes,
              templates: a.templates,
              pages: a.pages,
            }))}
          />
        </div>
      </main>
    </div>
  </div>
  );
}
