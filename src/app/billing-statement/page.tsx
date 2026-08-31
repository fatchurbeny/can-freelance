import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getLatestSyncStatus } from '@/app/actions/sync';
import { getContractRateAction } from '@/app/actions/notion-config';
import Sidebar from '@/components/Sidebar';
import CloudflareTopBar from '@/components/CloudflareTopBar';
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
import PayrollStatusToggle from '@/components/PayrollStatusToggle';
import { getPayrollStatusMap } from '@/app/actions/payroll-status';
import ApprovalPayrollTable from '@/components/ApprovalPayrollTable';

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
  searchParams: Promise<{ paymentMonth?: string; tab?: string }>;
}) {
  const searchParams = await props.searchParams;
  const latestSyncLog = await getLatestSyncStatus();
  const contractRateRes = await getContractRateAction();
  const contractRate = contractRateRes.success ? contractRateRes.contractRate : 15000;

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
  const activeTab = searchParams.tab || 'summary';

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
      const payment = d.status === 'Resign' ? 0 : qty * pages * poolRate * contractRate!;
      
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
      const payment = d.status === 'Resign' ? 0 : qty * pages * poolRate * contractRate!;
      
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

  const upcomingTasksData = JSON.parse(JSON.stringify(
    await prisma.task.findMany({
      where: {
        payrollMonth: null,
        designStatus: {
          countsAsApproved: true,
        }
      },
      include: {
        doctype: true,
        designer: true,
        taskAccounts: {
          include: { account: true }
        }
      }
    })
  )) as Array<any>;

  const payrollStatusMap = selectedMonth !== 'Unknown'
    ? await getPayrollStatusMap(designers.map((designer) => designer.id), selectedMonth)
    : new Map<string, boolean>();

  const activeAssignedDesigners = designers.filter((designer) => designer.status === 'Active' && designer.totalTasks > 0);
  const activeAssignedDesignerIds = new Set(activeAssignedDesigners.map((designer) => designer.id));
  const paidDesignerCount = Array.from(payrollStatusMap.entries()).filter(([designerId, isPaid]) => isPaid && activeAssignedDesignerIds.has(designerId)).length;
  const unpaidDesignerCount = activeAssignedDesigners.length - paidDesignerCount;
  let upcomingPayout = 0;
  let upcomingTemplates = 0;
  let upcomingPages = 0;
  const upcomingDoctypes = new Set<string>();
  const upcomingDesigners = new Set<string>();

  upcomingTasksData.forEach(t => {
    const qty = Number(t.qtySubmit || 0);
    const pages = Number(t.pages || 0);
    const poolRate = Number(t.doctype?.poolRate || 0);
    const payment = qty * pages * poolRate * contractRate!;
    
    upcomingPayout += payment;
    upcomingTemplates += qty;
    upcomingPages += qty * pages;
    if (t.doctypeId) upcomingDoctypes.add(t.doctypeId);
    if (t.designerId) upcomingDesigners.add(t.designerId);
  });

  const now = new Date();
  const currentMonthStr = `${INDONESIAN_MONTHS[now.getMonth()]}-${now.getFullYear()}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthStr = `${INDONESIAN_MONTHS[nextMonthDate.getMonth()]}-${nextMonthDate.getFullYear()}`;
  const approvalMonthOptions = Array.from(new Set([...availableMonths, currentMonthStr, nextMonthStr]));

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <CloudflareTopBar badgeLabel="BILLING" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <Sidebar currentSyncLog={latestSyncLog} />

        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col p-6 md:p-8 bg-grid-pattern">

          {/* Single Continuous Outer Container */}
          <div className="w-full rounded-xl border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] shadow-none">
            
            {/* Block 0: Sticky Navigation Tabs */}
            <div className="sticky top-[56px] z-30 flex items-stretch overflow-x-auto rounded-t-xl border-b border-[#f0f0f0] dark:border-[#272a34] bg-[#f8f9fa] dark:bg-[#0d0e12] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Link
                href={`?paymentMonth=${selectedMonth}&tab=summary`}
                className={`relative flex items-center gap-2 px-5 py-3 text-sm transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
                  activeTab === 'summary'
                    ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                    : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>Summary</span>
                {activeTab === 'summary' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
                )}
              </Link>
              <Link
                href={`?paymentMonth=${selectedMonth}&tab=approval-payroll`}
                className={`relative flex items-center gap-2 px-5 py-3 text-sm transition-all duration-150 cursor-pointer whitespace-nowrap border-r border-[#f0f0f0] dark:border-[#272a34] ${
                  activeTab === 'approval-payroll'
                    ? 'bg-white dark:bg-[#16181d] text-gray-900 dark:text-white font-bold'
                    : 'bg-[#f8f9fa] dark:bg-[#0d0e12] text-gray-600 dark:text-gray-400 font-medium hover:bg-[#f0f1f3] dark:hover:bg-[#16181d]/50 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>Approval Payroll</span>
                {upcomingTasksData.length > 0 && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                    activeTab === 'approval-payroll'
                      ? 'bg-[#ff5e1f]/10 text-[#ff5e1f]'
                      : 'bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {upcomingTasksData.length}
                  </span>
                )}
                {activeTab === 'approval-payroll' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#ff5e1f]" />
                )}
              </Link>
            </div>

            {activeTab === 'summary' ? (
              <>
                {/* Block 1: Contract Rules Banner Header */}
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
                      <span className="w-2 h-2 rounded-full bg-[#ff5e1f]" />
                      <span>Kalender: <strong className="font-bold text-gray-900 dark:text-white">25 Hari Kerja/Bulan</strong></span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-600 dark:text-gray-300">
                      <span className="w-2 h-2 rounded-full bg-[#ff5e1f]" />
                      <span>Rate/Pool: <strong className="font-bold text-gray-900 dark:text-white">IDR {contractRate!.toLocaleString('id-ID')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Block 2: Continuous KPI Grid (Refrensi Image 3) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
                  
                  {/* Card 1: Total Unpaid This Month */}
                  <div className="p-5 flex flex-col justify-between h-[130px] border-b md:border-b-0 md:border-r border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Total Unpaid This Month
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                          {formatCurrency(totalMonthlyPayout)}
                        </span>
                        <StatIndicator current={totalMonthlyPayout} prev={prevTotalMonthlyPayout} />
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">
                        Bulan Lalu : {formatCurrency(prevTotalMonthlyPayout)}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Approved, No Payroll Month */}
                  <div className="p-5 flex flex-col justify-between h-[130px] border-b md:border-b-0 lg:border-r border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Approved, No Payroll Month
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                        {formatCurrency(upcomingPayout)}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        <span>{upcomingTasksData.length} Task</span>
                        <span>•</span>
                        <span>{upcomingTemplates} Template</span>
                        <span>•</span>
                        <span>{upcomingPages} Pages</span>
                        <span>•</span>
                        <span>{upcomingDoctypes.size} Doctype</span>
                        <span>•</span>
                        <span>{upcomingDesigners.size} Designer</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Design Leader */}
                  <div className="p-5 flex flex-col justify-between h-[130px] border-b md:border-b-0 md:border-r border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Design Leader
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Trophy className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-bold font-mono text-amber-500">{designLeader}</span>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">Bulan lalu : {prevDesignLeader}</p>
                    </div>
                  </div>

                  {/* Card 4: Total Tasks */}
                  <div className="p-5 flex flex-col justify-between h-[130px] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Total Tasks
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{totalTasks}</span>
                        <StatIndicator current={totalTasks} prev={prevTotalTasks} />
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">Bulan lalu : {prevTotalTasks}</p>
                    </div>
                  </div>

                </div>

                {/* Second KPI Grid Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] border-t border-[#f0f0f0] dark:border-[#272a34]">
                  
                  {/* Card 5: Total Template */}
                  <div className="p-5 flex flex-col justify-between h-[130px] border-b md:border-b-0 md:border-r border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Total Template
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                        <Package className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{totalTemplates}</span>
                        <StatIndicator current={totalTemplates} prev={prevTotalTemplates} />
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">Bulan lalu : {prevTotalTemplates}</p>
                    </div>
                  </div>

                  {/* Card 6: Total Pages */}
                  <div className="p-5 flex flex-col justify-between h-[130px] border-b md:border-b-0 lg:border-r border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Total Pages
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Files className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{totalPages}</span>
                        <StatIndicator current={totalPages} prev={prevTotalPages} />
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">Bulan lalu : {prevTotalPages}</p>
                    </div>
                  </div>

                  {/* Card 7: Total Doctype */}
                  <div className="p-5 flex flex-col justify-between h-[130px] border-b md:border-b-0 md:border-r border-[#f0f0f0] dark:border-[#272a34] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Total Doctype
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">{uniqueDoctypes.size}</span>
                        <StatIndicator current={uniqueDoctypes.size} prev={prevUniqueDoctypes.size} />
                      </div>
                      <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-1">Bulan lalu : {prevUniqueDoctypes.size}</p>
                    </div>
                  </div>

                  {/* Card 8: Designer Status */}
                  <div className="p-5 flex flex-col justify-between h-[130px] hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-mono font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        Designer Status
                      </span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 flex-1 min-h-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs mb-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Paid
                        </div>
                        <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white leading-none">
                          {paidDesignerCount}
                        </div>
                      </div>

                      <div className="shrink-0 self-stretch flex items-center px-1 text-gray-300 dark:text-gray-700 font-semibold select-none">
                        |
                      </div>

                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-rose-600 dark:text-rose-400 font-mono font-bold text-xs mb-1">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          Unpaid
                        </div>
                        <div className="text-2xl font-bold font-mono text-gray-900 dark:text-white leading-none">
                          {unpaidDesignerCount}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Block 3: Payout Breakdown Section */}
                <div className="flex flex-col bg-white dark:bg-[#0d0e12] rounded-b-xl">
                  {/* Toolbar Header */}
                  <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12]">
                    <div className="flex items-center gap-3">
                      <h3 className="font-mono font-bold text-xs uppercase text-gray-900 dark:text-white tracking-wider">
                        Payout Breakdown
                      </h3>
                      <MonthFilter availableMonths={availableMonths} selectedMonth={selectedMonth} />
                    </div>
                    <button className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 cursor-pointer">
                      <Archive className="w-3.5 h-3.5" />
                      <span>Download all Statement</span>
                    </button>
                  </div>

                  {/* Designer Payout Accordions */}
                  <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12] rounded-b-xl">
                    {designers.filter(d => d.totalTasks > 0).map((designer) => (
                      <details key={designer.id} className={`group bg-white dark:bg-[#0d0e12] marker:content-[''] ${designer.status !== 'Active' ? 'opacity-60 grayscale-[50%]' : ''}`}>
                        <summary className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-[#16181d]/60 transition-colors list-none gap-4">
                          
                          <div className="flex items-center gap-3 w-[220px] shrink-0">
                            <div className="w-9 h-9 rounded-full border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-center font-mono font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-[#16181d] text-xs">
                              {getInitials(designer.displayName)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className={`font-bold text-xs font-mono ${designer.status === 'Resign' ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                                  {designer.displayName}
                                </h3>
                                {designer.status !== 'Active' && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider rounded uppercase ${
                                    designer.status === 'Resign' ? 'text-rose-500 bg-rose-500/10' : 'text-amber-500 bg-amber-500/10'
                                  }`}>
                                    {designer.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500">Designer</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 lg:gap-8 flex-1 w-full justify-between lg:justify-start">
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">Task</span>
                              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">{designer.totalTasks}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">Templates</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-500 text-xs">{designer.totalTemplates}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">QTY Pages</span>
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs">{designer.totalPages}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase">Total Payroll</span>
                              <span className="font-mono font-bold text-emerald-600 dark:text-[#ff5e1f] text-xs">{formatCurrency(designer.totalPayroll)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                            <PayrollStatusToggle
                              designerId={designer.id}
                              payrollMonth={selectedMonth}
                              isPaid={payrollStatusMap.get(designer.id) ?? false}
                            />
                            <Link 
                              href={`/billing-statement/print?designerId=${designer.id}&paymentMonth=${selectedMonth}`}
                              target="_blank"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-3 py-1 text-xs font-mono font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-700 hover:text-[#ff5e1f] dark:hover:text-[#ff5e1f] transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print</span>
                            </Link>
                            <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-180" />
                          </div>
                        </summary>

                        <div className="p-4 border-t border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#0d0e12]">
                          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                            Itemized Task Calculations
                          </h4>
                          
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse font-mono text-xs min-w-[800px]">
                              <thead>
                                <tr className="border-b border-[#f0f0f0] dark:border-[#272a34] text-[11px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                  <th className="pb-2 px-2 font-semibold">TASK TITLE</th>
                                  <th className="pb-2 px-2 font-semibold">DOCTYPE</th>
                                  <th className="pb-2 px-2 font-semibold">CANVA ACCOUNT</th>
                                  <th className="pb-2 px-2 text-center font-semibold">QTY SUBMIT</th>
                                  <th className="pb-2 px-2 text-center font-semibold">PAGES</th>
                                  <th className="pb-2 px-2 text-center font-semibold">POLL SCORE</th>
                                  <th className="pb-2 px-2 text-right font-semibold">RATE/POLL</th>
                                  <th className="pb-2 px-2 text-right font-semibold">TOTAL PAYMENT</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
                                {designer.tasks.map((task) => (
                                  <tr key={task.id} className="hover:bg-gray-100/50 dark:hover:bg-[#16181d]/50 transition-colors">
                                    <td className="py-2.5 px-2 text-gray-900 dark:text-white font-bold truncate max-w-[200px]" title={task.name || 'Untitled'}>
                                      {task.name || 'Untitled'}
                                    </td>
                                    <td className="py-2.5 px-2 text-gray-600 dark:text-gray-400">
                                      {task.doctype?.displayName || '-'}
                                    </td>
                                    <td className={`py-2.5 px-2 font-bold ${getBrandColor(task.accountName)}`}>
                                      {task.accountName}
                                    </td>
                                    <td className="py-2.5 px-2 text-center text-gray-900 dark:text-white font-bold">
                                      {task.qty}
                                    </td>
                                    <td className="py-2.5 px-2 text-center text-gray-600 dark:text-gray-400">
                                      {task.pages}
                                    </td>
                                    <td className="py-2.5 px-2 text-center text-indigo-600 dark:text-indigo-400 font-bold">
                                      {task.poolRate}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-gray-600 dark:text-gray-400">
                                      {formatCurrency(contractRate!)}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-emerald-600 dark:text-[#ff5e1f] font-bold">
                                      {formatCurrency(task.payment)}
                                    </td>
                                  </tr>
                                ))}
                                {designer.tasks.length === 0 && (
                                  <tr>
                                    <td colSpan={8} className="py-4 text-center text-gray-400 dark:text-gray-500 text-xs">
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
                      <div className="p-8 text-center text-xs font-mono text-gray-400 dark:text-gray-500">
                        No payroll data available for {selectedMonth}.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <ApprovalPayrollTable tasks={upcomingTasksData as any} allMonthOptions={approvalMonthOptions} />
            )}
          </div>
        </main>
    </div>
  </div>
  );
}
