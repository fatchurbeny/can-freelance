const MONTH_MAP: Record<string, string> = {
  januari: '01', jan: '01',
  februari: '02', feb: '02',
  maret: '03', mar: '03',
  april: '04', apr: '04',
  mei: '05', may: '05',
  juni: '06', jun: '06',
  juli: '07', jul: '07',
  agustus: '08', agt: '08', august: '08', aug: '08',
  september: '09', sep: '09',
  oktober: '10', okt: '10', october: '10', oct: '10',
  november: '11', nov: '11',
  desember: '12', des: '12', december: '12', dec: '12',
};

export const INDONESIAN_FULL_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const INDONESIAN_SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
];

/** Returns current calendar month formatted e.g. "September-2026" */
export function currentTaskMonth(): string {
  const now = new Date();
  return `${INDONESIAN_FULL_MONTHS[now.getMonth()]}-${now.getFullYear()}`;
}

/** Parses any taskMonth format (e.g. "Agustus-2026", "Agt-2026", "2026-08") to canonical "YYYY-MM" */
export function parseTaskMonthToKey(taskMonth?: string | null): string | null {
  if (!taskMonth) return null;
  const clean = taskMonth.trim().toLowerCase();
  
  // Handle ISO date format "2026-08-01" or "2026-08-01T..."
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    return clean.substring(0, 7);
  }

  const parts = clean.split('-');
  if (parts.length !== 2) return null;

  // "2026-08"
  if (/^\d{4}$/.test(parts[0]) && /^\d{1,2}$/.test(parts[1])) {
    return `${parts[0]}-${parts[1].padStart(2, '0')}`;
  }
  // "08-2026"
  if (/^\d{1,2}$/.test(parts[0]) && /^\d{4}$/.test(parts[1])) {
    return `${parts[1]}-${parts[0].padStart(2, '0')}`;
  }
  // "agustus-2026" or "agt-2026"
  if (MONTH_MAP[parts[0]] && /^\d{4}$/.test(parts[1])) {
    return `${parts[1]}-${MONTH_MAP[parts[0]]}`;
  }
  // "2026-agustus"
  if (/^\d{4}$/.test(parts[0]) && MONTH_MAP[parts[1]]) {
    return `${parts[0]}-${MONTH_MAP[parts[1]]}`;
  }

  return null;
}

/** Converts "Agustus-2026" or "2026-08" to ISO date string "2026-08-01" for Notion Date property */
export function formatTaskMonthToDateString(taskMonth?: string | null): string | null {
  const key = parseTaskMonthToKey(taskMonth);
  if (!key) return null;
  return `${key}-01`;
}

/** Converts Date ISO string e.g. "2026-08-01" to "Agustus-2026" */
export function formatDateStringToTaskMonth(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const key = parseTaskMonthToKey(dateStr);
  if (!key) return dateStr;
  const [year, month] = key.split('-');
  const mIdx = parseInt(month, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${INDONESIAN_FULL_MONTHS[mIdx]}-${year}`;
  }
  return dateStr;
}

/** Formats "YYYY-MM" to readable label e.g. "Agt-2026" */
export function formatPeriodKeyToLabel(periodKey: string): string {
  const parts = periodKey.split('-');
  if (parts.length !== 2) return periodKey;
  const [year, month] = parts;
  const mIdx = parseInt(month, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${INDONESIAN_SHORT_MONTHS[mIdx]}-${year}`;
  }
  return periodKey;
}

/** Returns true if a task's taskMonth matches any of the selected period keys (e.g. ["2026-08"]) */
export function isTaskInPeriods(taskMonth: string | null | undefined, selectedPeriods: string[]): boolean {
  if (!selectedPeriods || selectedPeriods.length === 0) return true;
  const taskKey = parseTaskMonthToKey(taskMonth);
  if (taskKey && selectedPeriods.includes(taskKey)) return true;
  if (taskMonth) {
    return selectedPeriods.some((p) => {
      const formattedLabel = formatPeriodKeyToLabel(p).toLowerCase();
      return taskMonth.toLowerCase().includes(p.toLowerCase()) || taskMonth.toLowerCase().includes(formattedLabel);
    });
  }
  return false;
}
