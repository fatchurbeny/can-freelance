"use client";

import { usePathname, useRouter } from 'next/navigation';
import SelectDropdown from '@/components/SelectDropdown';

/** Pilih periode billing designer; ganti bulan = ganti `paymentMonth` di URL. */
export default function OwnMonthSelect({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <div className="w-full sm:w-56">
      <SelectDropdown
        label="Pilih bulan"
        value={selected}
        onChange={(m) => router.push(`${pathname}?paymentMonth=${encodeURIComponent(m)}`)}
        options={months.map((m) => ({ value: m, label: m }))}
        buttonClassName="rounded-none"
      />
    </div>
  );
}
