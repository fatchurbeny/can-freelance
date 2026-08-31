import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';

export const dynamic = 'force-dynamic';
import Sidebar from '@/components/Sidebar';
import CloudflareTopBar from '@/components/CloudflareTopBar';
import DesignerStatusSelect from '@/components/DesignerStatusSelect';
import { Gavel, Trophy, CircleDot } from 'lucide-react';

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
        include: { designStatus: true }
      }
    }
  });

  const designers = designersData.map(d => {
    const approved = d.tasks.filter(t => t.designStatus?.countsAsApproved).length;
    const templates = d.tasks.reduce((acc, t) => acc + Number(t.qtySubmit || 0), 0);
    const pages = d.tasks.reduce((acc, t) => acc + (Number(t.qtySubmit || 0) * Number(t.pages || 0)), 0);
    return { ...d, approved, templates, pages };
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
      <CloudflareTopBar badgeLabel="ACCOUNT & TEAM" actionButton={{ label: 'Add Team/Account' }} />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex-1 md:ml-56 p-6 md:p-8 space-y-8 overflow-x-hidden bg-grid-pattern">


        {/* Single Continuous Container */}
        <div className="w-full rounded-xl overflow-hidden border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">

          {/* Contract Rules Banner */}
          <div className="p-6 bg-white dark:bg-[#0d0e12] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] flex items-center justify-center shrink-0">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display font-bold text-sm text-gray-900 dark:text-white capitalize">
                  Ketentuan & Aturan Kontrak Freelance
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                  Kontrak dimulai sejak 26 Januari 2026
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-600 dark:text-gray-300">
                <CircleDot className="w-3.5 h-3.5 text-gray-400" />
                <span>Kalender: <strong className="font-bold text-gray-900 dark:text-white">25 Hari Kerja/Bulan</strong></span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-600 dark:text-gray-300">
                <CircleDot className="w-3.5 h-3.5 text-gray-400" />
                <span>Rate/Poll: <strong className="font-bold text-gray-900 dark:text-white">IDR {contractRate!.toLocaleString('id-ID')}</strong></span>
              </div>
            </div>
          </div>

          {/* 2 Columns Side-by-Side Table Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
            
            {/* Left: Designer Table */}
            <div className="flex flex-col">
              <div className="p-5 flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12]">
                <div>
                  <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Designer ({designers.length})</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Designer Leaderboard All Time</p>
                </div>
                {designers.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold border border-amber-500/20">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span className="uppercase">{designers[0].displayName}</span>
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <th className="pl-5 pr-3 py-3 font-semibold">NAME / ROLE</th>
                      <th className="px-3 py-3 text-center font-semibold">STATUS</th>
                      <th className="px-2 py-3 text-center font-semibold">APPROVED</th>
                      <th className="px-2 py-3 text-center font-semibold">TEMPLATES</th>
                      <th className="pr-5 pl-2 py-3 text-center font-semibold">PAGES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
                    {designers.map((d, i) => {
                      const isTop = i === 0;
                      const isInactive = d.status !== 'Active';
                      return (
                        <tr
                          key={d.id}
                          className={`hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors ${
                            isTop ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="pl-5 pr-3 py-3">
                            <div className={`flex items-center gap-3 ${isInactive ? 'opacity-50 grayscale' : ''}`}>
                              <div className="w-8 h-8 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-700 dark:text-gray-200 shrink-0">
                                {getInitials(d.displayName)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-900 dark:text-white truncate">{d.displayName}</span>
                                <span className="text-[10px] text-gray-400 truncate font-sans">
                                  {d.displayName.toLowerCase().replace(/\s+/g, '')}@improstd.com
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap">
                            <DesignerStatusSelect designerId={d.id} initialStatus={d.status} />
                          </td>
                          <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-indigo-600 dark:text-[#ff5e1f]">
                            {d.approved}
                          </td>
                          <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                            {d.templates}
                          </td>
                          <td className="pr-5 pl-2 py-3 text-center whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">
                            {d.pages}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Canva Account Table */}
            <div className="flex flex-col">
              <div className="p-5 flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12]">
                <div>
                  <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">Canva Account ({accounts.length})</h3>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Brand Leaderboard All Time</p>
                </div>
                {accounts.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold border border-amber-500/20">
                    <Trophy className="w-3 h-3 text-amber-500" />
                    <span className="uppercase">{accounts[0].displayName}</span>
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12] text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      <th className="pl-5 pr-3 py-3 font-semibold">BRAND ACCOUNT</th>
                      <th className="px-3 py-3 text-center font-semibold">DOCTYPE</th>
                      <th className="px-3 py-3 text-center font-semibold">TEMPLATES</th>
                      <th className="pr-5 pl-3 py-3 text-center font-semibold">PAGES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
                    {accounts.map((a, i) => {
                      const isTop = i === 0;
                      return (
                        <tr
                          key={a.id}
                          className={`hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors ${
                            isTop ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
                          }`}
                        >
                          <td className="pl-5 pr-3 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs shrink-0 ${getBrandColor(a.displayName)}`}>
                                {getInitials(a.displayName)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-gray-900 dark:text-white truncate">{a.displayName}</span>
                                <span className="text-[10px] text-gray-400 truncate font-sans">
                                  {a.displayName.toLowerCase().replace(/\s+/g, '')}@improstd.com
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap font-bold text-pink-600 dark:text-pink-400">
                            {a.doctypes}
                          </td>
                          <td className="px-3 py-3 text-center whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                            {a.templates}
                          </td>
                          <td className="pr-5 pl-3 py-3 text-center whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">
                            {a.pages}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  </div>
  );
}
