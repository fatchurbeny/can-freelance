"use client";

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { changePinAction } from '@/app/actions/auth';
import { LEGACY_PIN_LENGTH, PIN_LENGTH, validatePinStrength } from '@/lib/pin-rules';
import PinBoxes from './PinBoxes';

export default function ChangePinForm({ forced = true }: { forced?: boolean }) {
  const [oldPin, setOldPin] = useState('');
  // PIN lama boleh masih 6 angka (sebelum 2026-11-16).
  const [legacyOld, setLegacyOld] = useState(false);
  const oldLength = legacyOld ? LEGACY_PIN_LENGTH : PIN_LENGTH;
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const strengthError = newPin.length === PIN_LENGTH ? validatePinStrength(newPin) : null;
  const rules = [
    { ok: newPin.length === PIN_LENGTH, text: `Tepat ${PIN_LENGTH} angka` },
    { ok: newPin.length === PIN_LENGTH && !strengthError, text: 'Bukan angka berulang atau berurutan' },
    { ok: newPin.length === PIN_LENGTH && newPin !== oldPin, text: 'Berbeda dari PIN lama' },
    { ok: newPin.length === PIN_LENGTH && newPin === confirmPin, text: 'Ulangi PIN sama' },
  ];
  const canSubmit = oldPin.length === oldLength && rules.every((r) => r.ok);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await changePinAction(oldPin, newPin, confirmPin);
      if (!res.success) { setError(res.error || 'Gagal mengganti PIN.'); return; }
      // Navigasi penuh: layout (sidebar/akses) dimuat ulang dengan sesi yang sudah final, tanpa menunggu transisi router.
      window.location.assign(window.location.pathname.replace(/\/change-pin\/?$/, '/'));
    });
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) submit(); }}
      className="flex w-full max-w-[460px] flex-col gap-5 rounded-none border border-[#e5e7eb] bg-white p-10 dark:border-[#272a34] dark:bg-[#16181d]"
    >
      <div className="flex flex-col gap-1.5">
        {forced && <span className="text-xs font-semibold uppercase text-gray-400">Langkah wajib</span>}
        <h1 className="text-2xl font-bold">{forced ? 'Buat PIN baru' : 'Ganti PIN'}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {forced
            ? `PIN awal dari Admin dan PIN 6 angka lama tidak dipakai lagi. Buat PIN pribadi ${PIN_LENGTH} angka sebelum melanjutkan.`
            : 'Masukkan PIN saat ini, lalu buat PIN baru. Sesi di perangkat ini tetap aktif.'}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">PIN lama</span>
        <PinBoxes key={oldLength} value={oldPin} onChange={setOldPin} label="PIN lama" size="md" length={oldLength} />
        <button
          type="button"
          onClick={() => { setLegacyOld((v) => !v); setOldPin(''); }}
          className="self-start text-xs text-gray-500 underline-offset-2 hover:text-[#ff5e1f] hover:underline dark:text-gray-400 cursor-pointer"
        >
          {legacyOld ? 'PIN lama 4 angka' : 'PIN lama masih 6 angka'}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">PIN baru</span>
        <PinBoxes value={newPin} onChange={setNewPin} label="PIN baru" size="md" />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Ulangi PIN baru</span>
        <PinBoxes value={confirmPin} onChange={setConfirmPin} label="Ulangi PIN" size="md" />
      </div>
      <ul className="flex flex-col gap-1.5 rounded-none border border-dashed border-[#e5e7eb] p-4 text-[13px] text-gray-500 dark:border-[#272a34] dark:text-gray-400">
        {rules.map((r) => (
          <li key={r.text}>{r.ok ? '☑' : '☐'} {r.text}</li>
        ))}
      </ul>
      {error && (
        <div role="alert" className="rounded-none border border-dashed border-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}
      <button type="submit" disabled={pending || !canSubmit} className="h-12 rounded-none bg-[#ff5e1f] text-[15px] font-bold text-white disabled:opacity-50">
        {pending ? 'Menyimpan…' : forced ? 'Simpan dan lanjut' : 'Simpan PIN baru'}
      </button>
      {!forced && (
        <Link href="/" className="text-center text-[13px] text-gray-500 hover:text-[#ff5e1f] dark:text-gray-400">
          Batal
        </Link>
      )}
    </form>
  );
}
