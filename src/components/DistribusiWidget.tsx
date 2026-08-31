'use client';

import { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';

interface DistribusiWidgetProps {
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
    return (
      <div className="bg-[#111827]/95 border border-gray-200 dark:border-gray-800 p-3.5 rounded-xl shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5 font-bold" style={{ color: BRAND_COLORS[entry.name] || '#6366F1' }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND_COLORS[entry.name] || '#6366F1' }}></span>
          {entry.name}
        </div>
        <p className="text-gray-200 font-semibold">
          {entry.value.toLocaleString('id-ID')} Templates
        </p>
        {entry.payload.tooltip && (() => {
          const items = entry.payload.tooltip.split('||').map((s: string) => s.trim()).filter(Boolean);
          const visible = items.slice(0, 5);
          const remaining = items.length - visible.length;
          return (
            <div className="max-w-[240px]">
              <p className="text-[10px] text-gray-500 font-bold mb-1">Top Doctype:</p>
              <ul className="space-y-0.5">
                {visible.map((item: string, idx: number) => {
                  const parts = item.split('::');
                  if (parts.length === 4) {
                    const [doctype, taskCount, templateCount, pageCount] = parts;
                    return (
                      <li key={idx} className="flex flex-col gap-0.5 text-[10px] mb-1.5">
                        <span className="flex items-center gap-1.5 text-gray-300 font-medium truncate" title={doctype}>
                          <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: BRAND_COLORS[entry.name] || '#6366F1', opacity: 0.6 }} />
                          {doctype}
                        </span>
                        <span className="text-gray-400 font-mono font-medium pl-2.5 text-[9px]">({taskCount}/{templateCount}Template @{pageCount}Pages)</span>
                      </li>
                    );
                  }
                  return (
                    <li key={idx} className="flex items-center justify-between gap-3 text-[10px]">
                      <span className="flex items-center gap-1.5 text-gray-300 font-medium truncate">
                        <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: BRAND_COLORS[entry.name] || '#6366F1', opacity: 0.6 }} />
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {remaining > 0 && (
                <p className="text-[9px] text-gray-500 mt-1 italic">+{remaining} lainnya</p>
              )}
            </div>
          );
        })()}
      </div>
    );
  }
  return null;
};

export default function DistribusiWidget({ data, brandName }: DistribusiWidgetProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);

  const toggleBrand = (brandName: string) => {
    setExpandedBrand(prev => prev === brandName ? null : brandName);
  };

  // Format numbers to match standard formats (e.g. 1.2k)
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
  };

  // If filtered by a single brand, collapse other segments to show only that brand
  const filteredData = brandName && brandName !== 'Semua Brand'
    ? data.filter((d) => d.name === brandName)
    : data.filter((d) => d.value > 0);

  const totalTemplates = filteredData.reduce((sum, d) => sum + d.value, 0);

  // Compute monthly average
  // Since we query rolling 6 months, we divide by 6 or number of actual active months
  const avgTemplates = Math.round(totalTemplates / 6);

  return (
    <div className="p-6 relative flex flex-col h-full min-h-[360px] bg-white dark:bg-[#0d0e12]">
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h3 className="font-display font-bold text-sm text-gray-900 dark:text-white">
            Distribusi Template
          </h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            Jumlah Task Tiap Bulan - {brandName === 'Semua Brand' ? 'Semua Brand (6)' : brandName}
          </p>
        </div>
        <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ff5e1f]/10 text-[#ff5e1f] dark:text-[#ff7038] border border-[#ff5e1f]/20 uppercase whitespace-nowrap shrink-0">
          AVG.{avgTemplates} TEMPLATE
        </span>
      </div>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 mt-2 w-full">
        {/* Donut Chart Container (40%) */}
        <div className="relative w-full sm:w-[45%] flex justify-center items-center h-64 shrink-0">
          <div className="relative w-64 h-64 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={115}
                  paddingAngle={filteredData.length > 1 ? 3 : 0}
                  cornerRadius={8}
                  dataKey="value"
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {filteredData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={BRAND_COLORS[entry.name] || '#6366F1'}
                      className="stroke-[#F5F0EB] dark:stroke-[#111827] stroke-[3px]"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Total Text */}
            <div 
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none transition-opacity duration-200"
              style={{ opacity: hoveredIndex !== null ? 0 : 1 }}
            >
              <span className="font-display font-bold text-2xl text-gray-900 dark:text-white leading-none">
                {formatNumber(totalTemplates)}
              </span>
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium mt-1">
                Templates
              </span>
            </div>
          </div>
        </div>

        {/* Legend (60%) */}
        <div className="w-full sm:w-[60%] space-y-3 self-center max-h-56 overflow-y-auto pr-2">
          {filteredData.map((d) => {
            const doctypes = d.tooltip
              ? d.tooltip.split('||').map((s: string) => s.trim()).filter(Boolean)
              : [];
            
            const isExpanded = expandedBrand === d.name;

            return (
              <div key={d.name} className="flex items-start gap-2.5 text-[13px] group">
                <span
                  className="w-2.5 h-2.5 rounded-[1px] shrink-0 mt-0.5"
                  style={{ backgroundColor: BRAND_COLORS[d.name] || '#6366F1' }}
                />
                <div className="flex-1 min-w-0">
                  <div 
                    className="flex items-center justify-between font-medium text-gray-800 dark:text-gray-200 leading-none cursor-pointer hover:opacity-75 transition-opacity"
                    onClick={() => toggleBrand(d.name)}
                  >
                    <span className="truncate">{d.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 font-mono text-[11px] font-semibold">{formatNumber(d.value)} Template</span>
                      <svg 
                        className={`w-3.5 h-3.5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {isExpanded && doctypes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {doctypes.map((item: string, idx: number) => {
                        const parts = item.split('::');
                        if (parts.length === 4) {
                          const [doctype, taskCount, templateCount, pageCount] = parts;
                          return (
                            <li key={idx} className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pl-1 border-l border-gray-200 dark:border-gray-800 ml-1">
                              <span className="w-1 h-1 rounded-full bg-gray-500 shrink-0" />
                              <span className="truncate">{doctype} ({taskCount}/{templateCount}Template @{pageCount}Pages)</span>
                            </li>
                          );
                        }
                        return (
                          <li key={idx} className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5 pl-1 border-l border-gray-200 dark:border-gray-800 ml-1">
                            <span className="w-1 h-1 rounded-full bg-gray-500 shrink-0" />
                            <span className="truncate">{item}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
