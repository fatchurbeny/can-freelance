import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { 
  Gavel, 
  Archive, 
  ChevronDown, 
  Printer,
  FileText,
  Files,
  Package,
  Layers,
  Users,
  Trophy,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import React from 'react';
import MonthFilter from './MonthFilter';

function formatCurrency(amount: number) {
  return `IDR ${amount.toLocaleString('id-ID')}`;
}

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

const INDONESIAN_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function getPreviousMonth(monthStr: string): string | null {
  const parts = monthStr.split('-');
  if (parts.length !== 2) return null;
  const [month, yearStr] = parts;
  const monthIdx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === month.toLowerCase());
  if (monthIdx === -1) return null;
  
  let prevMonthIdx = monthIdx - 1;
  let year = parseInt(yearStr, 10);
  
  if (prevMonthIdx < 0) {
    prevMonthIdx = 11;
    year -= 1;
  }
  
  return `${INDONESIAN_MONTHS[prevMonthIdx]}-${year}`;
}

function getMonthValue(monthStr: string): number {
  const parts = monthStr.split('-');
  if (parts.length !== 2) return 0;
  const monthIdx = INDONESIAN_MONTHS.findIndex(m => m.toLowerCase() === parts[0].toLowerCase());
  const year = parseInt(parts[1], 10);
  return year * 100 + (monthIdx >= 0 ? monthIdx : 0);
}

function StatIndicator({ current, prev }: { current: number, prev: number }) {
  if (current === prev || prev === 0) {
    return (
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-500/20 border border-gray-300 dark:border-gray-500 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-[10px] font-medium">
        <span>-</span>
      </div>
    );
  }
  
  const percentage = Math.abs(Math.round(((current - prev) / prev) * 100));
  
  if (current > prev) {
    return (
      <div className="flex items-center gap-1 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500 text-green-600 dark:text-green-500 px-2 py-1 rounded-full text-[10px] font-medium">
        <ArrowUpRight className="w-3 h-3" />
        <span>{percentage}%</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500 text-red-600 dark:text-red-500 px-2 py-1 rounded-full text-[10px] font-medium">
      <ArrowDownRight className="w-3 h-3" />
      <span>{percentage}%</span>
    </div>
  );
}

export default async function BillingStatementPage(props: {
  searchParams: Promise<{ paymentMonth?: string }>;
}) {
  const searchParams = await props.searchParams;
  const latestSyncLog = await getLatestSyncStatus();

  // Find available months
  const tasksWithMonths = await prisma.task.findMany({
    where: { payrollMonth: { not: null } },
    select: { payrollMonth: true },
    distinct: ['payrollMonth'],
  });
  
  const availableMonths = tasksWithMonths
    .map(t => t.payrollMonth!)
    .sort((a, b) => getMonthValue(b) - getMonthValue(a));
  
  const selectedMonth = searchParams.paymentMonth || availableMonths[0] || 'Unknown';

  // Fetch all designers with their approved tasks for the selected month
  const designersData = await prisma.designer.findMany({
    include: {
      tasks: {
        where: {
          payrollMonth: selectedMonth,
          designStatus: { countsAsApproved: true }
        },
        include: {
          doctype: true,
          taskAccounts: {
            include: { account: true }
          }
        }
      }
    }
  });

  // Calculate metrics per designer
  let totalMonthlyPayout = 0;
  let totalTasks = 0;
  let totalTemplates = 0;
  let totalPages = 0;
  let designerPaidCount = 0;
  
  const uniqueDoctypes = new Set<string>();

  const designers = designersData.map(d => {
    let designerPayroll = 0;
    const designerTasksCount = d.tasks.length;
    let designerTemplates = 0;
    let designerPages = 0;

    const processedTasks = d.tasks.map(t => {
      const qty = Number(t.qtySubmit || 0);
      const pages = Number(t.pages || 0);
      const poolRate = Number(t.doctype?.poolRate || 0);
      const payment = qty * pages * poolRate * 15000;
      
      designerPayroll += payment;
      designerTemplates += qty;
      designerPages += qty * pages;
      if (t.doctypeId) uniqueDoctypes.add(t.doctypeId);

      return {
        ...t,
        qty,
        pages,
        poolRate,
        payment,
        accountName: t.taskAccounts.length > 0 ? t.taskAccounts[0].account.displayName : 'Unknown'
      };
    });

    totalMonthlyPayout += designerPayroll;
    totalTasks += designerTasksCount;
    totalTemplates += designerTemplates;
    totalPages += designerPages;

    if (designerPayroll > 0) designerPaidCount++;

    return {
      ...d,
      tasks: processedTasks,
      totalTasks: designerTasksCount,
      totalTemplates: designerTemplates,
      totalPages: designerPages,
      totalPayroll: designerPayroll
    };
  }).sort((a, b) => b.totalPayroll - a.totalPayroll); // Sort by highest payroll

  const designLeader = designers.length > 0 && designers[0].totalPayroll > 0 ? designers[0].displayName : 'None';

  const previousMonth = selectedMonth !== 'Unknown' ? getPreviousMonth(selectedMonth) : null;
  const prevDesignersData = previousMonth ? await prisma.designer.findMany({
    include: {
      tasks: {
        where: {
          payrollMonth: previousMonth,
          designStatus: { countsAsApproved: true }
        },
        include: { doctype: true }
      }
    }
  }) : [];
  
  let prevTotalMonthlyPayout = 0;
  let prevTotalTasks = 0;
  let prevTotalTemplates = 0;
  let prevTotalPages = 0;
  const prevUniqueDoctypes = new Set<string>();
  
  const prevDesigners = prevDesignersData.map(d => {
    let designerPayroll = 0;

    d.tasks.forEach(t => {
      const qty = Number(t.qtySubmit || 0);
      const pages = Number(t.pages || 0);
      const poolRate = Number(t.doctype?.poolRate || 0);
      const payment = qty * pages * poolRate * 15000;
      
      designerPayroll += payment;
      prevTotalTemplates += qty;
      prevTotalPages += qty * pages;
      if (t.doctypeId) prevUniqueDoctypes.add(t.doctypeId);
    });

    prevTotalMonthlyPayout += designerPayroll;
    prevTotalTasks += d.tasks.length;

    return { displayName: d.displayName, totalPayroll: designerPayroll };
  }).sort((a, b) => b.totalPayroll - a.totalPayroll);
  
  const prevDesignLeader = prevDesigners.length > 0 && prevDesigners[0].totalPayroll > 0 ? prevDesigners[0].displayName : 'None';

  // Fetch upcoming unpaid tasks (approved but no payroll month)
  const upcomingTasksData = await prisma.task.findMany({
    where: {
      payrollMonth: null,
      designStatus: {
        countsAsApproved: true,
      }
    },
    include: { doctype: true }
  });

  let upcomingPayout = 0;
  let upcomingTemplates = 0;
  let upcomingPages = 0;
  const upcomingDoctypes = new Set<string>();
  const upcomingDesigners = new Set<string>();

  upcomingTasksData.forEach(t => {
    const qty = Number(t.qtySubmit || 0);
    const pages = Number(t.pages || 0);
    const poolRate = Number(t.doctype?.poolRate || 0);
    const payment = qty * pages * poolRate * 15000;
    
    upcomingPayout += payment;
    upcomingTemplates += qty;
    upcomingPages += qty * pages;
    if (t.doctypeId) upcomingDoctypes.add(t.doctypeId);
    if (t.designerId) upcomingDesigners.add(t.designerId);
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F5F0EB] dark:bg-[#0a0b0e] text-gray-900 dark:text-gray-100 transition-colors">
      <Sidebar currentSyncLog={latestSyncLog} />

      <main className="flex-1 p-6 md:p-8 space-y-8 overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#E8E0D8] dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
              Billing Statements
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Akumulasi rekapitulasi total gaji desainer per bulan berdasarkan QTY desain ter-approve.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-medium shadow-sm">
              IS
            </div>
          </div>
        </div>

        {/* Contract Banner */}
        <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white p-2.5 rounded-lg shrink-0">
              <Gavel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Ketentuan & aturan kontrak freelance
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                kontrak dimulai sejak 26 januari 2026
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 md:border-l border-[#E8E0D8] dark:border-gray-800 md:pl-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="w-3 h-3 rounded-full border-[3px] border-indigo-500" />
              <span>Kalender : <strong className="font-semibold text-gray-900 dark:text-white">25 hari kerja/bulan</strong></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="w-3 h-3 rounded-full border-[3px] border-indigo-500" />
              <span>rate/poll : <strong className="font-bold text-gray-900 dark:text-white">iDR 15.000</strong></span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-col xl:flex-row gap-6">
          
          {/* Main Stat Card (Total Payout & Upcoming) */}
          <div className="flex flex-col gap-6 w-full xl:w-[380px] shrink-0">
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center w-full">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Unpaid Payment
              </span>
              <div className="bg-orange-100 dark:bg-orange-500/20 p-1.5 rounded-md">
                <FileText className="w-4 h-4 text-orange-500" />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalMonthlyPayout)}</span>
                <StatIndicator current={totalMonthlyPayout} prev={prevTotalMonthlyPayout} />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bulan Lalu : {formatCurrency(prevTotalMonthlyPayout)}</p>
            </div>
          </div>

          <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
            <div className="flex justify-between items-center w-full mb-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Potential Task Paid
              </span>
              <div className="bg-orange-100 dark:bg-orange-500/20 p-1.5 rounded-md">
                <FileText className="w-4 h-4 text-orange-500" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(upcomingPayout)}</span>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap overflow-x-auto hide-scrollbar">
                <span>{upcomingTasksData.length} Task</span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span>{upcomingTemplates} Template</span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span>{upcomingPages} Pages</span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span>{upcomingDoctypes.size} Doctype</span>
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span>{upcomingDesigners.size} Designer</span>
              </div>
            </div>
          </div>
        </div>

          {/* Grid of smaller stats */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Design Leader */}
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Design Leader</span>
                <div className="bg-yellow-100 dark:bg-yellow-500/20 p-1.5 rounded-md">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                </div>
              </div>
              <div>
                <span className="text-3xl font-bold text-yellow-500">{designLeader}</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bulan lalu : {prevDesignLeader}</p>
              </div>
            </div>

            {/* Total Tasks */}
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</span>
                <div className="bg-indigo-100 dark:bg-indigo-500/20 p-1.5 rounded-md">
                  <Layers className="w-4 h-4 text-indigo-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalTasks}</span>
                  <StatIndicator current={totalTasks} prev={prevTotalTasks} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bulan lalu : {prevTotalTasks}</p>
              </div>
            </div>

            {/* Total Template */}
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Template</span>
                <div className="bg-orange-100 dark:bg-orange-500/20 p-1.5 rounded-md">
                  <Package className="w-4 h-4 text-orange-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalTemplates}</span>
                  <StatIndicator current={totalTemplates} prev={prevTotalTemplates} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bulan lalu : {prevTotalTemplates}</p>
              </div>
            </div>

            {/* Total Pages */}
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Pages</span>
                <div className="bg-blue-100 dark:bg-blue-500/20 p-1.5 rounded-md">
                  <Files className="w-4 h-4 text-blue-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{totalPages}</span>
                  <StatIndicator current={totalPages} prev={prevTotalPages} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bulan lalu : {prevTotalPages}</p>
              </div>
            </div>

            {/* Total Doctype */}
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Doctype</span>
                <div className="bg-pink-100 dark:bg-pink-500/20 p-1.5 rounded-md">
                  <FileText className="w-4 h-4 text-pink-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{uniqueDoctypes.size}</span>
                  <StatIndicator current={uniqueDoctypes.size} prev={prevUniqueDoctypes.size} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bulan lalu : {prevUniqueDoctypes.size}</p>
              </div>
            </div>

            {/* Designer Paid */}
            <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl p-5 flex flex-col justify-between h-[140px] shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Designer Unpaid
                </span>
                <div className="bg-green-100 dark:bg-green-500/20 p-1.5 rounded-md">
                  <Users className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">{designerPaidCount}</span>
                  <StatIndicator current={designerPaidCount} prev={prevDesigners.filter(d => d.totalPayroll > 0).length} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Designer Belum Terbayar
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Payout Breakdown Section */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-semibold uppercase tracking-wide text-gray-900 dark:text-white">
              Payout Breakdown
            </h2>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors opacity-50 cursor-not-allowed">
              <Archive className="w-4 h-4" />
              Download all Statement
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Statement Period</span>
              <MonthFilter availableMonths={availableMonths} selectedMonth={selectedMonth} />
            </div>
          </div>

          <div className="space-y-4">
            {designers.filter(d => d.totalTasks > 0).map((designer) => (
              <details key={designer.id} className={`group glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 rounded-xl overflow-hidden shadow-sm marker:content-[''] ${!designer.isActive ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <summary className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none gap-4">
                  
                  <div className="flex items-center gap-3 w-[220px] shrink-0">
                    <div className="w-10 h-10 rounded-full border border-[#E8E0D8] dark:border-gray-700 flex items-center justify-center font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 text-sm">
                      {getInitials(designer.displayName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold text-sm ${!designer.isActive ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {designer.displayName}
                        </h3>
                        {!designer.isActive && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-red-600 bg-red-100 rounded-md uppercase">Resigned</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Designer</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-8 flex-1 w-full justify-between lg:justify-start">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Task</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 text-sm">{designer.totalTasks}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Templates</span>
                      <span className="font-semibold text-yellow-600 dark:text-yellow-500 text-sm">{designer.totalTemplates}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">QTY Pages</span>
                      <span className="font-semibold text-blue-600 dark:text-blue-500 text-sm">{designer.totalPages}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Payroll</span>
                      <span className="font-semibold text-green-600 dark:text-green-500 text-sm">{formatCurrency(designer.totalPayroll)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
                    <Link 
                      href={`/billing-statement/print?designerId=${designer.id}&paymentMonth=${selectedMonth}`}
                      target="_blank"
                      className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print
                    </Link>
                    <div className="w-px h-6 bg-[#E8E0D8] dark:bg-gray-700"></div>
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="p-4 border-t border-[#E8E0D8] dark:border-gray-800 bg-gray-50 dark:bg-[#0a0b0e]">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-4">Itemized Task Calculations</h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead className="text-[11px] font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="pb-3 px-2">Task title</th>
                          <th className="pb-3 px-2">Doctype</th>
                          <th className="pb-3 px-2">Canva Account</th>
                          <th className="pb-3 px-2 text-center">QTY Submit</th>
                          <th className="pb-3 px-2 text-center">Pages</th>
                          <th className="pb-3 px-2 text-center">Poll Score</th>
                          <th className="pb-3 px-2 text-right">Rate/Poll</th>
                          <th className="pb-3 px-2 text-right">Total Payment</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-[#E8E0D8] dark:divide-gray-800/50">
                        {designer.tasks.map((task) => (
                          <tr key={task.id} className="group-hover:bg-gray-100/50 dark:group-hover:bg-gray-800/20 transition-colors">
                            <td className="py-3 px-2 text-gray-900 dark:text-white font-medium truncate max-w-[200px]" title={task.name || 'Untitled'}>
                              {task.name || 'Untitled'}
                            </td>
                            <td className="py-3 px-2 text-gray-600 dark:text-gray-400">
                              {task.doctype?.displayName || '-'}
                            </td>
                            <td className={`py-3 px-2 font-medium ${getBrandColor(task.accountName)}`}>
                              {task.accountName}
                            </td>
                            <td className="py-3 px-2 text-center text-gray-900 dark:text-white font-medium">
                              {task.qty}
                            </td>
                            <td className="py-3 px-2 text-center text-gray-600 dark:text-gray-400">
                              {task.pages}
                            </td>
                            <td className="py-3 px-2 text-center text-indigo-600 dark:text-indigo-400 font-semibold">
                              {task.poolRate}
                            </td>
                            <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-400">
                              {formatCurrency(15000)}
                            </td>
                            <td className="py-3 px-2 text-right text-green-600 dark:text-green-500 font-semibold">
                              {formatCurrency(task.payment)}
                            </td>
                          </tr>
                        ))}
                        {designer.tasks.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                              No approved tasks for this period.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </details>
            ))}

            {designers.filter(d => d.totalTasks > 0).length === 0 && (
              <div className="glass dark:bg-[#111827] border border-[#E8E0D8] dark:border-gray-800 p-8 rounded-xl text-center text-gray-500 dark:text-gray-400">
                No payroll data available for {selectedMonth}.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
