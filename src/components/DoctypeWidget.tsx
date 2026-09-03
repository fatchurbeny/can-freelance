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

interface DoctypeWidgetProps {
  data: any[];
  totalDoctypes: number;
  brandName: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    return (
      <div className="bg-[#111827]/95 border border-gray-200 dark:border-gray-800 p-3.5 rounded-xl shadow-xl text-xs space-y-2.5 backdrop-blur-md min-w-[180px]">
        <p className="font-bold text-gray-200 border-b border-gray-850 pb-1.5">
          {entry.payload.doctype}
        </p>
        <div className="flex flex-col gap-1.5 font-semibold">
          <span className="text-gray-400">Total Volume</span>
          <div className="pl-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">- Task</span>
              <span className="text-gray-200">{entry.payload.taskCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">- Template</span>
              <span className="text-gray-200">{entry.payload.templateCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">- Pages</span>
              <span className="text-gray-200">{entry.payload.pageCount}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function DoctypeWidget({ data, totalDoctypes, brandName }: DoctypeWidgetProps) {
  // Sort doctypes by task count desc (already done in SQL, but double check)
  const sortedData = [...data].sort((a, b) => b.taskCount - a.taskCount);

  return (
    <div className="p-6 relative flex flex-col h-full min-h-[350px] bg-white dark:bg-[#0d0e12]">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
            Kategori Doctype
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Doctype Yang Dikerjakan - {brandName}
          </p>
        </div>
        <span className="font-sans text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 uppercase whitespace-nowrap">
          {totalDoctypes} DOCTYPE
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full text-[10px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{ top: 10, right: 10, left: -25, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis 
              dataKey="doctype" 
              stroke="#9CA3AF" 
              tickLine={false} 
              axisLine={false}
              angle={-45}
              textAnchor="end"
              height={55}
              interval={0}
            />
            <YAxis 
              stroke="#9CA3AF" 
              tickLine={false} 
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.03)' }} />
            <Bar 
              dataKey="taskCount" 
              fill="#10B981" 
              radius={[4, 4, 0, 0]}
              barSize={12}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
