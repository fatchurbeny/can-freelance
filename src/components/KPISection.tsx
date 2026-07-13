import { 
  FileCheck2, 
  Layers, 
  CheckCircle, 
  Award, 
  Package,
  FileText
} from 'lucide-react';

interface KPIData {
  totalTasks: number;
  tasksChangePct: number;
  totalTemplates: number;
  templatesChangePct: number;
  totalPages: number;
  pagesChangePct: number;
  approvalRate: number;
  approvalChangePct: number;
  profileOnlyRate: number;
  profileOnlyChangePct: number;
  totalDoctypes: number;
}

interface KPISectionProps {
  kpi: KPIData;
  selectedPeriod: string;
}

export default function KPISection({ kpi, selectedPeriod }: KPISectionProps) {
  // Format numbers nicely like 1.2k
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return num.toLocaleString('id-ID');
  };

  const getTrendBadge = (pct: number, isRate = false) => {
    if (pct > 0) {
      return (
        <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          ↗ {Math.abs(pct)}%
        </span>
      );
    } else if (pct < 0) {
      return (
        <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400">
          ↘ {Math.abs(pct)}%
        </span>
      );
    }
    return (
      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 dark:bg-gray-500/20 text-gray-500 dark:text-gray-400">
        -
      </span>
    );
  };

  // Calculate some placeholder prior figures (since db seeder will supply changes)
  const priorTasks = Math.round(kpi.totalTasks / (1 + kpi.tasksChangePct / 100)) || 0;
  const priorTemplates = Math.round(kpi.totalTemplates / (1 + kpi.templatesChangePct / 100)) || 0;
  const priorPages = Math.round(kpi.totalPages / (1 + kpi.pagesChangePct / 100)) || 0;

  // Resolve dynamic label text based on selected months
  const periods = selectedPeriod.split(',').filter(Boolean);
  let periodLabel = 'Dalam 6 Bulan Terakhir';
  
  if (periods.length === 1) {
    const [y, m] = periods[0].split('-');
    const monthNamesFull: { [key: string]: string } = {
      '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April',
      '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus',
      '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember'
    };
    const mName = monthNamesFull[m] || m;
    periodLabel = `Dalam ${mName}-${y}`;
  } else if (periods.length > 1) {
    periodLabel = `Dalam ${periods.length} Bulan`;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {/* 1. Total Task */}
      <div className="glass dark:bg-[#111827] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            Total Task
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              {formatNumber(kpi.totalTasks)}
            </span>
            {getTrendBadge(kpi.tasksChangePct)}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2">
            Bulan Lalu : {formatNumber(priorTasks)}
          </p>
        </div>
      </div>

      {/* 2. Total Template */}
      <div className="glass dark:bg-[#111827] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            Total Template
          </span>
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              {formatNumber(kpi.totalTemplates)}
            </span>
            {getTrendBadge(kpi.templatesChangePct)}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2">
            Bulan Lalu : {formatNumber(priorTemplates)}
          </p>
        </div>
      </div>

      {/* 2.5 Total Pages */}
      <div className="glass dark:bg-[#111827] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            Total Pages
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
            <FileText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              {formatNumber(kpi.totalPages)}
            </span>
            {getTrendBadge(kpi.pagesChangePct)}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2">
            Bulan Lalu : {formatNumber(priorPages)}
          </p>
        </div>
      </div>

      {/* 3. Approval Rate */}
      <div className="glass dark:bg-[#111827] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            Approval Rate
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              {kpi.approvalRate}%
            </span>
            {getTrendBadge(kpi.approvalChangePct, true)}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2">
            {formatNumber(Math.round(kpi.totalTemplates * (kpi.approvalRate / 100)))} Template / {formatNumber(kpi.totalTemplates)} Submitted
          </p>
        </div>
      </div>

      {/* 4. Profile-Only */}
      <div className="glass dark:bg-[#111827] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            Profile-Only
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              {kpi.profileOnlyRate}%
            </span>
            {getTrendBadge(kpi.profileOnlyChangePct, true)}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2">
            {formatNumber(Math.round(kpi.totalTemplates * (kpi.profileOnlyRate / 100)))} Template / {formatNumber(kpi.totalTemplates)} Submitted
          </p>
        </div>
      </div>

      {/* 5. Total Doctype */}
      <div className="glass dark:bg-[#111827] rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">
            Total Doctype
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
            <FileCheck2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display font-bold text-3xl text-gray-900 dark:text-white">
              {kpi.totalDoctypes}
            </span>
            {getTrendBadge(0)}
          </div>
          <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2">
            {periodLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
