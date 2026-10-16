"use client";

import { useState } from 'react';
import Link from 'next/link';
import { UserCheck, Award, FileText, Calendar, CircleDot, Mail, CreditCard, KeyRound } from 'lucide-react';
import DesignerCareerTimeline, { type CareerLogItem } from '../DesignerCareerTimeline';

export interface MyProfile {
  id: string;
  displayName: string;
  role: string | null;
  status: string;
  contractType: string | null;
  isAgency: boolean;
  contractStartDate: string | null;
  probationEndDate: string | null;
  promotionDate: string | null;
  email: string | null;
  phone: string | null;
  bankName: string | null;
  bankAccount: string | null;
  approved: number;
  templates: number;
  pages: number;
  isLeaderboardWinner: boolean;
}

function fmtDate(value: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-stretch text-xs font-sans min-h-[44px]">
      <div className="w-[150px] shrink-0 border-r border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 px-5 py-2.5 flex items-center gap-2 font-bold text-gray-500 dark:text-gray-400 select-none">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 min-w-0 px-4 py-2.5 flex items-center font-bold text-gray-900 dark:text-white break-words">{children}</div>
    </div>
  );
}

/** Detail akun milik sendiri (hanya-baca): profil + timeline karier & milestone. */
export default function MyProfileView({ profile, logs, showChangePin = true }: { profile: MyProfile; logs: CareerLogItem[]; showChangePin?: boolean }) {
  const [tab, setTab] = useState<'profile' | 'timeline'>('profile');
  const icon = 'w-3.5 h-3.5 text-gray-400';

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col rounded-none border border-[#f0f0f0] bg-white font-sans dark:border-[#272a34] dark:bg-[#0d0e12]">
      <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-5 py-4 dark:border-[#272a34]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ff5e1f]/10 text-sm font-bold text-[#ff5e1f]">
          {profile.displayName.substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-base font-bold text-gray-900 dark:text-white">{profile.displayName}</h1>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              {profile.status}
            </span>
          </div>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">
            {profile.role || 'Designer'} • {profile.contractType || 'Freelance'}
            {profile.isAgency ? ' • Agency' : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] border-b border-[#f0f0f0] dark:divide-[#272a34] dark:border-[#272a34]">
        {[
          ['Approved Tasks', profile.approved, 'text-indigo-600 dark:text-[#ff5e1f]'],
          ['Templates Qty', profile.templates, 'text-amber-600 dark:text-amber-400'],
          ['Total Pages', profile.pages, 'text-blue-600 dark:text-blue-400'],
        ].map(([label, value, color]) => (
          <div key={label as string} className="px-3 py-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
            <div className={`text-lg font-bold ${color}`}>{value as number}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#f0f0f0] border-b border-[#f0f0f0] text-xs font-bold dark:divide-[#272a34] dark:border-[#272a34]">
        {([['profile', '1. Profil'], ['timeline', '2. Timeline Karir & Logs']] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative py-3 cursor-pointer ${tab === id ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            {label}
            {tab === id && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#ff5e1f]" />}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <div className="divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <Row icon={<UserCheck className={icon} />} label="Nama Designer">{profile.displayName}</Row>
          <Row icon={<Award className={icon} />} label="Role / Jabatan">{profile.role || '—'}</Row>
          <Row icon={<FileText className={icon} />} label="Jenis Kontrak">{profile.contractType || '—'}</Row>
          <Row icon={<Calendar className={icon} />} label="Contract Start">{fmtDate(profile.contractStartDate)}</Row>
          {profile.contractType === 'Probation' && (
            <Row icon={<Calendar className={icon} />} label="Probation End">{fmtDate(profile.probationEndDate)}</Row>
          )}
          <Row icon={<CircleDot className={icon} />} label="Status">{profile.status}</Row>
          <Row icon={<Mail className={icon} />} label="Email & Phone">
            <span className="truncate">{profile.email || '—'}</span>
            <span className="ml-4 shrink-0 text-gray-500 dark:text-gray-400">{profile.phone || ''}</span>
          </Row>
          <Row icon={<CreditCard className={icon} />} label="Bank & Rekening">
            {profile.bankName ? `${profile.bankName} · ${profile.bankAccount || '—'}` : '—'}
          </Row>
          <p className="px-5 py-3 text-[11px] text-gray-400">
            Data profil diubah oleh Admin. Hubungi Admin bila ada yang perlu dikoreksi.
          </p>
        </div>
      ) : (
        <DesignerCareerTimeline
          designer={{
            id: profile.id,
            displayName: profile.displayName,
            role: profile.role,
            status: profile.status,
            contractType: profile.contractType,
            contractStartDate: profile.contractStartDate,
            probationEndDate: profile.probationEndDate,
            promotionDate: profile.promotionDate,
            approved: profile.approved,
            templates: profile.templates,
            pages: profile.pages,
            isLeaderboardWinner: profile.isLeaderboardWinner,
          }}
          readOnly
          initialLogs={logs}
        />
      )}

      {showChangePin && (
      <div className="border-t border-[#f0f0f0] dark:border-[#272a34]">
        <Link
          href="/change-pin"
          className="flex h-12 items-center justify-center gap-2 bg-[#ff5e1f] text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ff7038]"
        >
          <KeyRound className="h-4 w-4" />
          <span>Ganti PIN</span>
        </Link>
      </div>
      )}
    </div>
  );
}
