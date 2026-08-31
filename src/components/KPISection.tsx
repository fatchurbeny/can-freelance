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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
      {/* 1. Total Task */}
      <div className="p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Task</h4>
            <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-3xl text-[#262626] dark:text-white">
              {formatNumber(kpi.totalTasks)}
            </span>
            {getTrendBadge(kpi.tasksChangePct)}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-2">
            Bulan Lalu : {formatNumber(priorTasks)}
          </p>
        </div>
      </div>

      {/* 2. Total Template */}
      <div className="p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Template</h4>
            <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-3xl text-[#262626] dark:text-white">
              {formatNumber(kpi.totalTemplates)}
            </span>
            {getTrendBadge(kpi.templatesChangePct)}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-2">
            Bulan Lalu : {formatNumber(priorTemplates)}
          </p>
        </div>
      </div>

      {/* 3. Total Pages */}
      <div className="p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Pages</h4>
            <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-3xl text-[#262626] dark:text-white">
              {formatNumber(kpi.totalPages)}
            </span>
            {getTrendBadge(kpi.pagesChangePct)}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-2">
            {periodLabel}
          </p>
        </div>
      </div>

      {/* 4. Approval Rate */}
      <div className="p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Approval Rate</h4>
            <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-3xl text-[#262626] dark:text-white">
              {kpi.approvalRate}%
            </span>
            {getTrendBadge(kpi.approvalChangePct, true)}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-2">
            {formatNumber(Math.round(kpi.totalTemplates * (kpi.approvalRate / 100)))} Template / {formatNumber(kpi.totalTemplates)} Submited
          </p>
        </div>
      </div>

      {/* 5. Profile-Only */}
      <div className="p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Profile-Only</h4>
            <div className="w-6 h-6 rounded-md bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-3xl text-[#262626] dark:text-white">
              {kpi.profileOnlyRate}%
            </span>
            {getTrendBadge(kpi.profileOnlyChangePct, true)}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-2">
            {formatNumber(Math.round(kpi.totalTemplates * (kpi.profileOnlyRate / 100)))} Template / {formatNumber(kpi.totalTemplates)} Submited
          </p>
        </div>
      </div>

      {/* 6. Total Doctype */}
      <div className="p-5 flex flex-col justify-between hover:bg-gray-50/50 dark:hover:bg-[#16181d]/50 transition-colors">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Doctype</h4>
            <div className="w-6 h-6 rounded-md bg-pink-500/10 flex items-center justify-center text-pink-500">
              <FileCheck2 className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display font-bold text-3xl text-[#262626] dark:text-white">
              {kpi.totalDoctypes}
            </span>
            {getTrendBadge(0)}
          </div>
          <p className="text-[11px] font-mono text-gray-400 dark:text-gray-500 mt-2">
            {periodLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
