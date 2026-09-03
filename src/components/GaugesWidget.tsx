'use client';

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer 
} from 'recharts';

interface GaugeProps {
  data: any[];
  brandName: string;
}

const formatNumber = (num: number) => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace('.0', '') + 'K';
  }
  return num.toString();
};

export function LisensiGauge({ data, brandName }: GaugeProps) {
  // Ensure we have both Pro and Free mapped, even with 0 templates
  const proTemplates = Number(data.find((d) => d.license?.toLowerCase() === 'pro')?.templates || 0);
  const freeTemplates = Number(data.find((d) => d.license?.toLowerCase() === 'free')?.templates || 0);
  const total = proTemplates + freeTemplates;

  const chartData = [
    { name: 'Pro', value: proTemplates, color: '#3B82F6' },
    { name: 'Free', value: freeTemplates, color: '#E5E7EB' } // Will adapt color on dark/light
  ];

  return (
    <div className="p-6 flex flex-col h-full bg-white dark:bg-[#0d0e12]">
      <div>
        <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
          Lisensi Template
        </h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          Lisensi Template Pro Vs Free - {brandName}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-end relative mt-2">
        {/* Semi Donut Chart */}
        <div className="relative w-60 h-32 shrink-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="200%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={105}
                paddingAngle={4}
                cornerRadius={10}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#3B82F6" className="stroke-none focus:outline-none" />
                <Cell 
                  fill="var(--background)" 
                  className="stroke-none focus:outline-none dark:fill-gray-800" 
                  style={{ fill: 'var(--color-free-fill)' }} 
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Text */}
          <div className="absolute left-0 right-0 bottom-2 flex flex-col items-center select-none pointer-events-none">
            <span className="font-sans font-bold text-3xl text-gray-900 dark:text-white leading-none">
              {formatNumber(total)}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1">
              Templates
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-around w-full mt-6 text-[10px] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
            <span className="text-gray-500 dark:text-gray-400">Pro</span>
            <span className="text-gray-900 dark:text-white">({formatNumber(proTemplates)} Template)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700" />
            <span className="text-gray-500 dark:text-gray-400">Free</span>
            <span className="text-gray-900 dark:text-white">({formatNumber(freeTemplates)} Template)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BahasaGauge({ data, brandName }: GaugeProps) {
  const engTemplates = Number(data.find((d) => d.language?.toUpperCase() === 'ENG')?.templates || 0);
  const indTemplates = Number(data.find((d) => d.language?.toUpperCase() === 'IND')?.templates || 0);
  const total = engTemplates + indTemplates;

  const chartData = [
    { name: 'English', value: engTemplates, color: '#10B981' },
    { name: 'Indonesia', value: indTemplates, color: '#F59E0B' }
  ];

  return (
    <div className="p-6 flex flex-col h-full bg-white dark:bg-[#0d0e12]">
      <div>
        <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
          Bahasa Template
        </h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
          Lisensi Template Pro Vs Free - {brandName}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-end relative mt-2">
        {/* Semi Donut Chart */}
        <div className="relative w-60 h-32 shrink-0 overflow-hidden">
          <ResponsiveContainer width="100%" height="200%">
            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                startAngle={180}
                endAngle={0}
                innerRadius={80}
                outerRadius={105}
                paddingAngle={4}
                cornerRadius={10}
                dataKey="value"
                stroke="none"
              >
                <Cell fill="#10B981" className="stroke-none focus:outline-none" />
                <Cell fill="#F59E0B" className="stroke-none focus:outline-none" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total Text */}
          <div className="absolute left-0 right-0 bottom-2 flex flex-col items-center select-none pointer-events-none">
            <span className="font-sans font-bold text-3xl text-gray-900 dark:text-white leading-none">
              {formatNumber(total)}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1">
              Templates
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-around w-full mt-6 text-[10px] font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-gray-500 dark:text-gray-400">English</span>
            <span className="text-gray-900 dark:text-white">({formatNumber(engTemplates)} Template)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span className="text-gray-500 dark:text-gray-400">Indonesia</span>
            <span className="text-gray-900 dark:text-white">({formatNumber(indTemplates)} Template)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
