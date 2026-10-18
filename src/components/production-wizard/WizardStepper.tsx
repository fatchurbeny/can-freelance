'use client';

import { Check } from 'lucide-react';
import { STEP_LABELS } from './types';

interface Props {
  current: number;
}

export default function WizardStepper({ current }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 font-sans text-xs">
      {STEP_LABELS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex size-6 items-center justify-center rounded-none border text-[11px] font-bold ${
                done
                  ? 'border-[#ff5e1f] bg-[#ff5e1f] text-white'
                  : active
                    ? 'border-[#ff5e1f] text-[#ff5e1f]'
                    : 'border-[#f0f0f0] dark:border-[#272a34] text-gray-400'
              }`}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
            </span>
            <span className={active ? 'font-semibold text-[#262626] dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
