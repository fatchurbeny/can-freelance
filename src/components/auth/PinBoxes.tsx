"use client";

import { useRef } from 'react';

interface PinBoxesProps {
  value: string;
  onChange: (next: string) => void;
  label: string;
  size?: 'md' | 'lg';
}

/** 6 kotak PIN numerik; mendukung ketik, hapus, dan tempel. */
export default function PinBoxes({ value, onChange, label, size = 'lg' }: PinBoxesProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // valueRef selalu terbaru walau ketikan beruntun datang sebelum React sempat render ulang.
  const valueRef = useRef(value);
  valueRef.current = value;
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const h = size === 'lg' ? 'h-14 text-xl' : 'h-12 text-lg';

  const commit = (next: string) => {
    valueRef.current = next;
    onChange(next);
  };

  const setAt = (i: number, ch: string) => {
    const arr = Array.from({ length: 6 }, (_, k) => valueRef.current[k] || '');
    arr[i] = ch;
    commit(arr.join('').replace(/\s/g, '').slice(0, 6));
  };

  return (
    <div className="grid grid-cols-6 gap-2">
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
            if (ch && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (!pasted) return;
            e.preventDefault();
            commit(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
          }}
          className={`${h} w-full rounded-none border border-[#e5e7eb] bg-white text-center font-sans text-[#262626] outline-none focus:border-[#ff5e1f] dark:border-[#272a34] dark:bg-[#16181d] dark:text-[#f4f4f5]`}
        />
      ))}
    </div>
  );
}
