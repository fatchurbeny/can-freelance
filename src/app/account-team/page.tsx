import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';

export const dynamic = 'force-dynamic';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import DesignerStatusSelect from '@/components/DesignerStatusSelect';
import { Plus, Gavel, Trophy, CircleDot } from 'lucide-react';

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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F5F0EB] dark:bg-[#0a0b0e] text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E8E0D8] dark:border-[#262936]">
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white capitalize">
              Account & Team Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Kelola profil desainer internal dan integrasi akun Canva Marketplace Impro Studio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
              IS
            </div>
          </div>
        </div>

        {/* Contract Rules Banner */}
        <div className="glass dark:bg-transparent dark:border dark:border-[#262936] p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-2.5 rounded-lg shrink-0">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white capitalize">
                Ketentuan & aturan kontrak freelance
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                kontrak dimulai sejak 26 januari 2026
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 capitalize">
              <CircleDot className="w-3.5 h-3.5 text-gray-400" />
              <span>Kalender : <strong className="font-semibold text-gray-900 dark:text-white">25 hari kerja/bulan</strong></span>
            </div>
            <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 capitalize">
              <CircleDot className="w-3.5 h-3.5 text-gray-400" />
              <span>rate/poll : <strong className="font-bold text-gray-900 dark:text-white">IDR {contractRate!.toLocaleString('id-ID')}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white capitalize">
            Active team members and canva account ({designers.length}/{accounts.length})
          </h2>
          <button disabled className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors opacity-50 cursor-not-allowed">
            <Plus className="w-4 h-4" />
            Add Team/Account
          </button>
        </div>

        {/* 2 Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Designers Column */}
          <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-xl shadow-sm flex flex-col">
            <div className="bg-white dark:bg-[#12141a] p-4 border-b border-[#E8E0D8] dark:border-[#262936] rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 dark:text-white font-semibold capitalize text-base">Designer ({designers.length})</h3>
                {designers.length > 0 && (
                  <div className="bg-orange-50 dark:bg-transparent dark:border dark:border-orange-400 rounded-full px-2 py-1.5 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-orange-400 font-medium uppercase">{designers[0].displayName}</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Designer Leaderboard all Time</p>
            </div>
            
            <div className="p-4 space-y-4 bg-white dark:bg-transparent flex-1">
              {designers.map((d, i) => (
                <div key={d.id} className={`flex items-center justify-between pb-4 ${i !== designers.length - 1 ? 'border-b border-[#E8E0D8] dark:border-[#262936]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border border-[#E8E0D8] dark:border-[#262936] flex items-center justify-center font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-transparent text-sm ${d.status !== 'Active' ? 'opacity-60 grayscale' : ''}`}>
                      {getInitials(d.displayName)}
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold text-gray-900 dark:text-white capitalize ${d.status !== 'Active' ? 'opacity-60 grayscale' : ''}`}>{d.displayName}</span>
                      </div>
                      <span className={`text-[10px] text-gray-500 font-medium ${d.status !== 'Active' ? 'opacity-60 grayscale' : ''}`}>Designer - {d.displayName.toLowerCase().replace(/\s+/g, '')}@improstd.com</span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2.5 text-center ${d.status !== 'Active' ? 'opacity-60 grayscale' : ''}`}>
                    <DesignerStatusSelect designerId={d.id} initialStatus={d.status} />
                    <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-lg px-2 py-1.5 flex flex-col items-center min-w-[66px]">
                      <span className="text-sm font-semibold text-indigo-600 dark:text-[#615fff]">{d.approved}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Approved Task</span>
                    </div>
                    <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-lg px-2 py-1.5 flex flex-col items-center min-w-[66px]">
                      <span className="text-sm font-semibold text-orange-400 dark:text-[#f0a848]">{d.templates}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Templates</span>
                    </div>
                    <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-lg px-2 py-1.5 flex flex-col items-center min-w-[66px]">
                      <span className="text-sm font-semibold text-blue-500 dark:text-[#3b7bff]">{d.pages}</span>
                      <span className="text-[10px] text-gray-500 font-medium">QTY Pages</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Canva Accounts Column */}
          <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-xl shadow-sm flex flex-col">
            <div className="bg-white dark:bg-[#12141a] p-4 border-b border-[#E8E0D8] dark:border-[#262936] rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 dark:text-white font-semibold capitalize text-base">Canva Account ({accounts.length})</h3>
                {accounts.length > 0 && (
                  <div className="bg-orange-50 dark:bg-transparent dark:border dark:border-orange-400 rounded-full px-2 py-1.5 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] text-orange-400 font-medium uppercase">{accounts[0].displayName}</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 font-medium mt-1">Brand Leaderboard All Time</p>
            </div>
            
            <div className="p-4 space-y-4 bg-white dark:bg-transparent flex-1">
              {accounts.map((a, i) => (
                <div key={a.id} className={`flex items-center justify-between pb-4 ${i !== accounts.length - 1 ? 'border-b border-[#E8E0D8] dark:border-[#262936]' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full border border-[#E8E0D8] dark:border-[#262936] flex items-center justify-center font-semibold bg-gray-50 dark:bg-transparent text-sm ${getBrandColor(a.displayName)}`}>
                      {getInitials(a.displayName)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{a.displayName}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Brand - {a.displayName.toLowerCase().replace(/\s+/g, '')}@improstd.com</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 text-center">
                    <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-lg px-2 py-1.5 flex flex-col items-center min-w-[66px]">
                      <span className="text-sm font-semibold text-pink-500 dark:text-[#ec4899]">{a.doctypes}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Doctype</span>
                    </div>
                    <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-lg px-2 py-1.5 flex flex-col items-center min-w-[66px]">
                      <span className="text-sm font-semibold text-orange-400 dark:text-[#f0a848]">{a.templates}</span>
                      <span className="text-[10px] text-gray-500 font-medium">Templates</span>
                    </div>
                    <div className="border border-[#E8E0D8] dark:border-[#262936] rounded-lg px-2 py-1.5 flex flex-col items-center min-w-[66px]">
                      <span className="text-sm font-semibold text-blue-500 dark:text-[#3b7bff]">{a.pages}</span>
                      <span className="text-[10px] text-gray-500 font-medium">QTY Pages</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
