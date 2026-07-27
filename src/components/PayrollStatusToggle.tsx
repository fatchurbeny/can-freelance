'use client';

import { useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { togglePayrollStatusAction } from '@/app/actions/payroll-status';

interface PayrollStatusToggleProps {
  designerId: string;
  payrollMonth: string;
  isPaid: boolean;
}

export default function PayrollStatusToggle({ designerId, payrollMonth, isPaid }: PayrollStatusToggleProps) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await togglePayrollStatusAction(designerId, payrollMonth, !isPaid);
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={isPaid}
      id={`toggle-payroll-${designerId}-${payrollMonth}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 ${
        isPaid
          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
      }`}
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isPaid ? <Check className="h-3.5 w-3.5" /> : null}
      {isPaid ? 'Paid' : 'Unpaid'}
    </button>
  );
}
