'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { getDropboxStatusAction, disconnectDropboxAction } from '@/app/actions/production-unit';
import type { PlatformOption, WizardData } from './types';

interface Props {
  data: WizardData;
  platform?: PlatformOption;
  onChange: (patch: Partial<WizardData>) => void;
}

interface Status {
  connected: boolean;
  accountEmail?: string | null;
}

export default function StepOutput({ data, platform, onChange }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const isDropbox = platform?.outputType === 'dropbox_link';

  useEffect(() => {
    if (!isDropbox) return;
    getDropboxStatusAction().then((s) => setStatus(s as Status));
  }, [isDropbox]);

  if (isDropbox) {
    const isSubpath = typeof window !== 'undefined' && window.location.pathname.startsWith('/can-freelance');
    const connectUrl = `${isSubpath ? '/can-freelance' : ''}/api/dropbox/oauth/start`;

    return (
      <div className="border border-[#f0f0f0] dark:border-[#272a34] p-4 space-y-4 font-sans">
        <div className="space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">Akun Dropbox</span>
          {status?.connected ? (
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Terhubung{status.accountEmail ? ` — ${status.accountEmail}` : ''}
              </span>
              <button
                type="button"
                onClick={async () => { await disconnectDropboxAction(); setStatus({ connected: false }); }}
                className="text-gray-500 hover:text-rose-500 cursor-pointer"
              >
                Putuskan
              </button>
            </div>
          ) : (
            <a
              href={connectUrl}
              className="inline-flex h-10 items-center px-4 bg-[#ff5e1f] text-white text-xs font-semibold"
            >
              Hubungkan Dropbox
            </a>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">Folder Root (dalam Apps/impro-freelance)</label>
          <input
            className="w-full h-11 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] px-3 text-xs outline-none focus:ring-1 focus:ring-[#ff5e1f]"
            placeholder="/Freelance Elements"
            value={data.dropboxRoot}
            onChange={(e) => onChange({ dropboxRoot: e.target.value })}
          />
          <p className="text-[11px] text-gray-400">Folder dibuat otomatis saat task pertama dibuat.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34] p-4 font-sans text-xs text-gray-600 dark:text-gray-300">
      Output untuk platform ini adalah <span className="font-semibold">Canva Link</span>. Link Canva diambil otomatis dari properti Template Link dan body task.
    </div>
  );
}
