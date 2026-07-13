'use client';

import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface PipelineWidgetProps {
  data: any[];
  inQueue: {
    tasks: number;
    templates: number;
  };
  brandName: string;
}

const STAGE_COLORS: { [key: string]: string } = {
  'Draft': '#9CA3AF',
  'Not Started': '#EF4444',
  'In Progress': '#3B82F6',
  'QA': '#06B6D4',
  'In Review': '#F59E0B',
  'Aproved': '#10B981',
  'Aproved-Profile Only': '#34D399',
  'Profile Only': '#34D399',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const cleanName = entry.payload.stage === 'Aproved-Profile Only' ? 'Profile Only' : entry.payload.stage;
    return (
      <div className="bg-[#111827]/95 border border-gray-200 dark:border-gray-800 p-3.5 rounded-xl shadow-xl text-xs space-y-2.5 backdrop-blur-md min-w-[180px]">
        <p className="font-bold text-gray-200 border-b border-gray-850 pb-1.5">
          {cleanName}
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

export default function PipelineWidget({ data, inQueue, brandName }: PipelineWidgetProps) {
  // Format the stage labels for display: "Aproved-Profile Only" -> "Profile Only"
  const formattedData = data.map((d) => ({
    ...d,
    displayStage: d.stage === 'Aproved-Profile Only' ? 'Profile Only' : d.stage,
  }));

  return (
    <div className="glass dark:bg-[#111827] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full min-h-[350px]">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            Task Pipeline
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Distribusi Task Per Tahap Pipeline - {brandName}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formattedData}
            layout="vertical"
            margin={{ top: 5, right: 15, left: -10, bottom: 5 }}
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
              dataKey="displayStage" 
              type="category" 
              stroke="#9CA3AF" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(156, 163, 175, 0.03)' }} />
            <Bar 
              dataKey="taskCount" 
              radius={[0, 4, 4, 0]}
              barSize={12}
            >
              {formattedData.map((entry, index) => {
                const color = STAGE_COLORS[entry.stage] || STAGE_COLORS[entry.displayStage] || '#6366F1';
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
