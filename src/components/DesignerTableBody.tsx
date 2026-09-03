'use client';

import { useState } from 'react';
import DesignerStatusSelect from './DesignerStatusSelect';
import DesignerDetailSlideModal, { DesignerItem } from './DesignerDetailSlideModal';
import { Award, User } from 'lucide-react';

function getInitials(name: string) {
  return name.substring(0, 2).toUpperCase();
}

interface Props {
  designers: DesignerItem[];
}

export default function DesignerTableBody({ designers }: Props) {
  const [selectedDesigner, setSelectedDesigner] = useState<DesignerItem | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'profile' | 'timeline'>('profile');

  return (
    <>
      <tbody className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] bg-white dark:bg-[#0d0e12]">
        {designers.map((d, i) => {
          const isTop = i === 0;
          const isInactive = d.status !== 'Active';

          return (
            <tr
              key={d.id}
              onClick={() => {
                setSelectedDesigner(d);
                setModalInitialTab('profile');
              }}
              className={`hover:bg-gray-50/80 dark:hover:bg-[#16181d] transition-colors cursor-pointer group ${
                isTop ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''
              }`}
            >
              {/* Name & Role Cell */}
              <td className="pl-5 pr-3 py-3">
                <div className={`flex items-center gap-3 ${isInactive ? 'opacity-50 grayscale' : ''}`}>
                  <div className="w-8 h-8 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-xs text-gray-700 dark:text-gray-200 shrink-0 group-hover:border-[#ff5e1f]/50 transition-colors">
                    {getInitials(d.displayName)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-gray-900 dark:text-white truncate group-hover:text-[#ff5e1f] transition-colors">
                      {d.displayName}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate">
                      {d.role || 'Junior Designer'}
                    </span>
                  </div>
                </div>
              </td>

              {/* Contract Type Cell */}
              <td className="px-3 py-3 text-center whitespace-nowrap">
                <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {d.contractType || 'Freelance'}
                </span>
              </td>

              {/* Specialization Cell (Top 3 Doctypes clean text - Left aligned & 2-line wrapped) */}
              <td className="px-3 py-3 text-left w-[220px] min-w-[180px] max-w-[240px]">
                <span className="text-[11px] font-sans font-medium text-gray-700 dark:text-gray-300 leading-snug line-clamp-2 block">
                  {d.specializationText || '—'}
                </span>
              </td>

              {/* Status Cell (Symmetrical Flat Table Cell) */}
              <td
                className="p-0 h-full min-h-[44px] align-stretch w-[130px] whitespace-nowrap"
                onClick={(e) => e.stopPropagation()}
              >
                <DesignerStatusSelect designerId={d.id} initialStatus={d.status} />
              </td>

              {/* Approved Tasks Count */}
              <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-indigo-600 dark:text-[#ff5e1f]">
                {d.approved || 0}
              </td>

              {/* Templates Count */}
              <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                {d.templates || 0}
              </td>

              {/* Pages Count */}
              <td className="px-2 py-3 text-center whitespace-nowrap font-bold text-blue-600 dark:text-blue-400">
                {d.pages || 0}
              </td>

              {/* Symmetrical Table Style Action Cell: Promote Button */}
              <td className="p-0 text-center whitespace-nowrap w-[120px] h-full align-stretch">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDesigner(d);
                    setModalInitialTab('timeline');
                  }}
                  className="w-full h-full min-h-[44px] border-l border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 hover:bg-[#ff5e1f] dark:hover:bg-[#ff5e1f] text-gray-700 dark:text-gray-300 hover:text-white dark:hover:text-white font-sans text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 text-[#ff5e1f] group-hover:text-white" />
                  <span>PROMOTE</span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>

      {/* Slide Modal Detail & Edit */}
      <DesignerDetailSlideModal
        open={!!selectedDesigner}
        designer={selectedDesigner}
        initialTab={modalInitialTab}
        onClose={() => setSelectedDesigner(null)}
      />
    </>
  );
}
