'use client';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface TrenVolumeWidgetProps {
  data: any[];
  brandName: string;
}

const BRAND_COLORS: { [key: string]: string } = {
  'Improstd': '#F97316',      // Orange
  'Antler': '#EF4444',        // Red
  'Zahra Art': '#10B981',    // Green
  'Chital Graphic': '#EC4899',// Pink
  'Ui Creative.net': '#8B5CF6',// Purple
  'Teman Siswa': '#3B82F6',  // Blue
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const data = entry.payload;
    const brand = entry.name;
    const taskCount = entry.value;
    const templates = data[`${brand}_templates`] || 0;
    const pages = data[`${brand}_pages`] || 0;
    const doctypes = data.tooltips?.[brand] || [];

    return (
      <div className="bg-[#111827]/95 border border-gray-200 dark:border-gray-800 p-3.5 rounded-xl shadow-xl text-xs space-y-2.5 backdrop-blur-md min-w-[180px]">
        <p className="font-bold text-gray-200 border-b border-gray-850 pb-1.5">
          {brand} : {data.monthLabel}
        </p>
        <div className="flex flex-col gap-1.5 font-semibold">
          <span className="text-gray-400">Total Volume</span>
          <div className="pl-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">- Task</span>
              <span className="text-gray-200">{taskCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">- Template</span>
              <span className="text-gray-200">{templates}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">- Pages</span>
              <span className="text-gray-200">{pages}</span>
            </div>
          </div>
        </div>
        {doctypes.length > 0 && (
          <div className="pt-0.5">
            <p className="text-[10px] text-gray-500 font-bold mb-1">Top Doctype:</p>
            <ul className="pl-3.5 list-disc text-[10px] text-gray-400 space-y-1 font-medium">
              {doctypes.map((dt: string, i: number) => (
                <li key={i}>{dt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function TrenVolumeWidget({ data, brandName }: TrenVolumeWidgetProps) {
  // Calculate average task count per month
  const monthlyTotals = data.map((d) => {
    return Object.keys(BRAND_COLORS).reduce((acc, brand) => acc + (d[brand] || 0), 0);
  });
  const avgTasks = monthlyTotals.length > 0
    ? Math.round(monthlyTotals.reduce((sum, val) => sum + val, 0) / monthlyTotals.length)
    : 0;

  // Determine active brands in data to generate Bar elements
  const activeBrands = brandName && brandName !== 'Semua Brand'
    ? [brandName]
    : Object.keys(BRAND_COLORS).filter((brand) => data.some((d) => d[brand] > 0));

  return (
    <div className="glass dark:bg-[#111827] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full min-h-[400px]">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            Tren Volume Task
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Jumlah Task Tiap Bulan - {brandName === 'Semua Brand' ? 'Semua Brand (6)' : brandName}
          </p>
        </div>
        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-[#615FFF] text-white uppercase shadow-sm">
          AVG.{avgTasks} TASK
        </span>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis 
              dataKey="monthLabel" 
              stroke="#9CA3AF" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip 
              shared={false} 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(156, 163, 175, 0.05)' }} 
            />
            <Legend 
              iconType="circle" 
              iconSize={6} 
              wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }}
            />
            {activeBrands.map((brand) => (
              <Bar
                key={brand}
                dataKey={brand}
                name={brand}
                stackId="brand"
                fill={BRAND_COLORS[brand] || '#6366F1'}
                radius={[6, 6, 6, 6]}
                strokeWidth={3}
                className="stroke-[#F5F0EB] dark:stroke-[#111827]"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
