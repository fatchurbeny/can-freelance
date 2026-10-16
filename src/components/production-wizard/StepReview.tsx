'use client';

import type { PlatformOption, WizardData } from './types';

interface Props {
  data: WizardData;
  platform?: PlatformOption;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 py-3 border-b border-[#f0f0f0] dark:border-[#272a34] font-sans text-xs">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-[#262626] dark:text-white break-all">{value || '—'}</span>
    </div>
  );
}

export default function StepReview({ data, platform }: Props) {
  return (
    <div className="border border-[#f0f0f0] dark:border-[#272a34]">
      <Row label="Nama" value={data.name} />
      <Row label="Slug" value={`/production/${data.slug}`} />
      <Row label="Platform" value={platform?.name ?? ''} />
      <Row label="Notion" value={data.notionMode === 'create' ? `Buat database baru di page ${data.parentPageId}` : `Hubungkan database ${data.databaseId}`} />
      <Row label="Output" value={platform?.outputType === 'dropbox_link' ? `Dropbox — ${data.dropboxRoot || 'root belum diisi'}` : 'Canva Link'} />
    </div>
  );
}
