'use client';

import { useState } from 'react';
import { Check, FileText, Loader2, Lock } from 'lucide-react';
import { checklistTone, type ChecklistState } from '@/lib/checklist-qa';

/** Tahap tampilan checklist mengikuti status task (spec §3.2). */
export type ChecklistStage = 'pre' | 'progress' | 'qa' | 'done';

export const CHECKLIST_TONE_CLASS: Record<ReturnType<typeof checklistTone>, string> = {
  neutral: 'border-[#E4E4E7] bg-[#FAFAFA] text-[#3F3F46] dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300',
  partial: 'border-[#FDE68A] bg-[#FFFBEB] text-[#A16207] dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-400',
  complete: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D] dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-400',
};

const STAGE_NOTE: Record<ChecklistStage, string> = {
  pre: 'Daftar ini adalah deliverable yang wajib diunggah designer. File satuan, tanpa .zip.',
  progress: 'Designer sedang mengerjakan. Checklist dikonfirmasi QA saat task masuk QA.',
  qa: 'QA mengonfirmasi setiap file di folder Dropbox task. In Review terbuka setelah semua item tercentang.',
  done: 'Checklist sudah lengkap.',
};

interface Props {
  state: ChecklistState;
  stage: ChecklistStage;
  /** Role QA (task.edit) boleh mencentang saat status QA. */
  canEdit: boolean;
  onToggle: (label: string, checked: boolean) => Promise<void>;
  onMoveToInReview: () => Promise<void>;
}

export default function ChecklistQASection({ state, stage, canEdit, onToggle, onMoveToInReview }: Props) {
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const tone = checklistTone(state.done, state.total);
  const editable = canEdit && stage === 'qa';
  const complete = state.total > 0 && state.done >= state.total;

  const toggle = async (label: string, checked: boolean) => {
    setBusyLabel(label);
    try {
      await onToggle(label, checked);
    } finally {
      setBusyLabel(null);
    }
  };

  const move = async () => {
    setMoving(true);
    try {
      await onMoveToInReview();
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 bg-[#f8f9fb] dark:bg-[#16181d]/60 px-5 pt-5 pb-24 font-sans">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Checklist QA</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Syarat pindah ke In Review</p>
        </div>
        <span className={`shrink-0 rounded-[5px] border px-[7px] py-px text-xs font-semibold ${CHECKLIST_TONE_CLASS[tone]}`}>
          {state.done}/{state.total}
        </span>
      </div>

      <p className="inline-flex w-fit items-center gap-1.5 border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] px-2 py-1 text-[11px] text-gray-500 dark:text-gray-400">
        <FileText className="w-3 h-3" />
        Tersimpan di body kartu Notion · bagian ✅ Checklist QA
      </p>

      <p className="text-xs leading-relaxed text-gray-600 dark:text-gray-300">
        {stage === 'done' && !complete
          ? 'Status sudah melewati QA, tetapi checklist belum lengkap (status diubah langsung di Notion).'
          : STAGE_NOTE[stage]}
      </p>

      <ul className="divide-y divide-[#f0f0f0] dark:divide-[#272a34] border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12]">
        {state.items.map((item) => {
          const busy = busyLabel === item.label;
          return (
            <li key={item.label}>
              <label className={`flex items-center gap-3 px-4 py-3 text-xs ${editable ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-[#16181d]/80' : 'cursor-default'}`}>
                {stage === 'pre' ? (
                  <span className="size-4 shrink-0 border border-[#E4E4E7] dark:border-[#272a34]" aria-hidden="true" />
                ) : (
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={!editable || !!busyLabel}
                    onChange={(e) => toggle(item.label, e.target.checked)}
                    className="size-4 shrink-0 accent-[#ff5e1f] disabled:cursor-not-allowed"
                  />
                )}
                <span className={`flex-1 font-semibold ${item.checked ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{item.label}</span>
                {busy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ff5e1f]" />
                ) : stage === 'pre' ? (
                  <span className="rounded-[5px] border border-[#E4E4E7] bg-[#FAFAFA] px-[7px] py-px text-[11px] text-[#3F3F46] dark:border-[#272a34] dark:bg-[#16181d] dark:text-gray-300">Wajib</span>
                ) : item.checked ? (
                  <Check className="w-3.5 h-3.5 text-[#15803D]" />
                ) : (
                  <span className="rounded-[5px] border border-[#FECACA] bg-[#FEF2F2] px-[7px] py-px text-[11px] text-[#DC2626] dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-400">Belum</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {stage === 'qa' && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={move}
            disabled={!complete || moving || !canEdit}
            className="flex h-10 items-center justify-center gap-2 bg-[#ff5e1f] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {moving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : !complete ? <Lock className="w-3.5 h-3.5" /> : null}
            Pindah ke In Review
          </button>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {complete
              ? 'Semua item tercentang. Task siap dikirim ke platform.'
              : `Masih ${state.total - state.done} item belum tercentang.`}
            {!canEdit && ' Hanya QA yang bisa mencentang.'}
          </p>
        </div>
      )}
    </div>
  );
}
