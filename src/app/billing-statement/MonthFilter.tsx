'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import MonthCalendarPicker from '@/components/MonthCalendarPicker';

export default function MonthFilter({ 
  availableMonths, 
  selectedMonth 
}: { 
  availableMonths: string[], 
  selectedMonth: string 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleMonthChange = (newMonth: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('paymentMonth', newMonth);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative h-full w-full flex items-stretch">
      <MonthCalendarPicker
        value={selectedMonth}
        availableMonths={availableMonths}
        mode="filter"
        onChange={handleMonthChange}
        placeholder="Pilih Bulan..."
      />
    </div>
  );
}
