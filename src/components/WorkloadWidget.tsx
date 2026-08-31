'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface WorkloadWidgetProps {
  data: any[];
  brandName: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const data = entry.payload;
    return (
      <div className="bg-[#111827]/95 border border-gray-200 dark:border-gray-800 p-2.5 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-bold text-gray-200">{data.designer}</p>
        <div className="text-[10px] text-gray-400 space-y-0.5 font-medium">
          <p>Task: <span className="text-white font-bold">{data.taskCount}</span></p>
          <p>Template: <span className="text-white font-bold">{data.templateCount || 0}</span></p>
          <p>Pages: <span className="text-white font-bold">{data.pageCount || 0}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export default function WorkloadWidget({ data, brandName }: WorkloadWidgetProps) {
  // Calculate averages across all designers
  const totalTasks = data.reduce((sum, d) => sum + d.taskCount, 0);
  const totalTemplates = data.reduce((sum, d) => sum + (d.templateCount || 0), 0);
  const totalPages = data.reduce((sum, d) => sum + (d.pageCount || 0), 0);

  const count = data.length || 1;
  const avgTasks = Math.round(totalTasks / count);
  const avgTemplates = Math.round(totalTemplates / count);
  const avgPages = Math.round(totalPages / count);

  return (
    <div className="p-6 relative flex flex-col h-full bg-white dark:bg-[#0d0e12]">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            Beban Kerja per Designer
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Jumlah Task Ditangani Bulan Ini - {brandName}
          </p>
        </div>
        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase whitespace-nowrap shrink-0">
          AVG.{avgPages} PAGES
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 15, left: -15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis 
              type="number" 
              stroke="#9CA3AF" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
            />
            <YAxis 
              dataKey="designer" 
              type="category" 
              stroke="#9CA3AF" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              width={65}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.03)' }} />
            <Bar 
              dataKey="taskCount" 
              fill="#34D399" 
              radius={[0, 4, 4, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
