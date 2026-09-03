export interface OptionItem {
  id: string;
  displayName: string;
}

export const PRIORITY_OPTIONS: OptionItem[] = [
  { id: 'Urgent', displayName: 'Urgent' },
  { id: 'High', displayName: 'High' },
  { id: 'Medium', displayName: 'Medium' },
  { id: 'Low', displayName: 'Low' },
];

export const LICENSE_OPTIONS: OptionItem[] = [
  { id: 'Pro', displayName: 'Pro' },
  { id: 'Free', displayName: 'Free' },
  { id: 'Extended', displayName: 'Extended' },
];

export const TASK_MONTH_OPTIONS: OptionItem[] = [
  { id: 'Januari-2026', displayName: 'Januari-2026' },
  { id: 'Februari-2026', displayName: 'Februari-2026' },
  { id: 'Maret-2026', displayName: 'Maret-2026' },
  { id: 'April-2026', displayName: 'April-2026' },
  { id: 'Mei-2026', displayName: 'Mei-2026' },
  { id: 'Juni-2026', displayName: 'Juni-2026' },
  { id: 'Juli-2026', displayName: 'Juli-2026' },
  { id: 'Agustus-2026', displayName: 'Agustus-2026' },
  { id: 'September-2026', displayName: 'September-2026' },
  { id: 'Oktober-2026', displayName: 'Oktober-2026' },
  { id: 'November-2026', displayName: 'November-2026' },
  { id: 'Desember-2026', displayName: 'Desember-2026' },
];

export function getPriorityStyle(priority?: string | null): string {
  switch (priority) {
    case 'Urgent':
    case 'urgent':
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-bold';
    case 'High':
    case 'high':
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
    case 'Medium':
    case 'medium':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
    case 'Low':
    case 'low':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  }
}

export function getLicenseStyle(license?: string | null): string {
  switch (license) {
    case 'Pro':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'Extended':
      return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400';
    case 'Free':
      return 'bg-gray-500/15 text-gray-600 dark:text-gray-400';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  }
}

export function getPagesForDoctype(doc?: { displayName?: string; pages?: number | null } | null): number {
  if (!doc) return 1;
  if (doc.pages != null && Number(doc.pages) > 0) {
    return Number(doc.pages);
  }
  const name = (doc.displayName || '').toLowerCase();
  if (name.includes('presentation') || name.includes('slides-12') || name.includes('calendar')) return 12;
  if (name.includes('infographic-slides')) return 15;
  if (name.includes('infographic')) return 6;
  if (name.includes('sosmed') || name.includes('carousel') || name.includes('magazine')) return 4;
  if (name.includes('newsletter')) return 3;
  if (name.includes('resume') || name.includes('cv')) return 2;
  return 1;
}
