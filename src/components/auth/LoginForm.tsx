"use client";

import { useState, useTransition } from 'react';
import { loginAction } from '@/app/actions/auth';
import PinBoxes from './PinBoxes';

export default function LoginForm() {
  const [userCode, setUserCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await loginAction(userCode, pin);
      if (!res.success) {
        setError(res.error || 'Gagal masuk.');
        setPin('');
        return;
      }
      const base = window.location.pathname.replace(/\/login\/?$/, '');
      window.location.assign(`${base}${res.mustChangePin ? '/change-pin' : '/'}`);
    });
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (userCode.trim() && pin.length === 6) submit(); }}
      className="flex w-full max-w-[420px] flex-col gap-6 rounded-none border border-[#e5e7eb] bg-white p-10 dark:border-[#272a34] dark:bg-[#16181d]"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-none bg-[#ff5e1f] text-lg font-extrabold text-white">S</div>
        <div className="text-lg font-bold">CAN Freelance</div>
      </div>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold">Masuk</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Gunakan ID dan PIN dari Admin.</p>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="userCode" className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">ID Pengguna</label>
        <input
          id="userCode"
          value={userCode}
          onChange={(e) => setUserCode(e.target.value)}
          placeholder="FT-001 atau FL-014"
          autoComplete="username"
          autoCapitalize="characters"
          className="h-12 w-full rounded-none border border-[#e5e7eb] bg-white px-3.5 text-base outline-none focus:border-[#ff5e1f] dark:border-[#272a34] dark:bg-[#0d0e12]"
        />
        <span className="text-xs text-gray-400">FT = Full-time · FL = Freelance</span>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">PIN (6 angka)</span>
        <PinBoxes value={pin} onChange={setPin} label="PIN" />
      </div>
      {error && (
        <div role="alert" className="rounded-none border border-dashed border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending || !userCode.trim() || pin.length !== 6}
        className="h-12 rounded-none bg-[#ff5e1f] text-[15px] font-bold text-white disabled:opacity-50"
      >
        {pending ? 'Memeriksa…' : 'Masuk'}
      </button>
      <p className="text-center text-[13px] text-gray-500 dark:text-gray-400">Lupa PIN? Hubungi Admin untuk reset.</p>
    </form>
  );
}
