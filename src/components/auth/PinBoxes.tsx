"use client";

import { useRef } from 'react';
import { PIN_LENGTH } from '@/lib/pin-rules';

interface PinBoxesProps {
  value: string;
  onChange: (next: string) => void;
  label: string;
  size?: 'md' | 'lg';
  /** Jumlah kotak (bawaan PIN_LENGTH). */
  length?: number;
}

/** Kotak PIN numerik (satu angka per kotak); mendukung ketik, hapus, dan tempel. */
export default function PinBoxes({ value, onChange, label, size = 'lg', length = PIN_LENGTH }: PinBoxesProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // valueRef selalu terbaru walau ketikan beruntun datang sebelum React sempat render ulang.
  const valueRef = useRef(value);
  valueRef.current = value;
  const digits = Array.from({ length }, (_, i) => value[i] || '');
  const h = size === 'lg' ? 'h-14 text-xl' : 'h-12 text-lg';

  const commit = (next: string) => {
    valueRef.current = next;
    onChange(next);
  };

  const setAt = (i: number, ch: string) => {
    const arr = Array.from({ length }, (_, k) => valueRef.current[k] || '');
    arr[i] = ch;
    commit(arr.join('').replace(/\s/g, '').slice(0, length));
  };

  return (
    <div className={`grid gap-2 ${length === 4 ? 'grid-cols-4' : 'grid-cols-6'}`}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={d}
          aria-label={`${label} digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, ch);
            if (ch && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
            if (!pasted) return;
            e.preventDefault();
            commit(pasted);
            refs.current[Math.min(pasted.length, length - 1)]?.focus();
          }}
          className={`${h} w-full rounded-none border border-[#e5e7eb] bg-white text-center font-sans text-[#262626] outline-none focus:border-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d] dark:text-[#f4f4f5]`}
        />
      ))}
    </div>
  );
}
