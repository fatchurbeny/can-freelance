import { type CardAction } from '../QACard';
import {
  FileText, FileClock, Loader2, Hourglass, FileCheck2, CheckCircle2, UserCheck, XCircle,
  type LucideIcon,
} from 'lucide-react';

export interface ColumnConfig {
  id: string;
  title: string;
  statuses: string[];
  dot: string;
  emptyMessage: string;
  actions?: CardAction[];
}

export const COLUMNS: ColumnConfig[] = [
  {
    id: 'draft',
    title: 'Draft',
    statuses: ['Draft', 'draft'],
    dot: 'bg-gray-400',
    emptyMessage: 'No Draft tasks.',
  },
  {
    id: 'notStarted',
    title: 'Not Started',
    statuses: ['Not Started', 'Not started'],
    dot: 'bg-indigo-300',
    emptyMessage: 'No Not Started tasks.',
  },
  {
    id: 'inProgress',
    title: 'In Progress',
    statuses: ['In Progress', 'In progress'],
    dot: 'bg-indigo-400',
    emptyMessage: 'No In Progress tasks.',
  },
  {
    id: 'qa',
    title: 'QA',
    statuses: ['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance', 'Testing/QA', 'QA/Testing'],
    dot: 'bg-amber-400',
    emptyMessage: 'No tasks in QA.',
    actions: [{ label: 'Move In Review', target: 'In Review', doneLabel: 'Moved to In Review' }],
  },
  {
    id: 'review',
    title: 'In Review',
    statuses: ['In Review', 'In review'],
    dot: 'bg-blue-400',
    emptyMessage: 'No tasks in review.',
    actions: [
      { label: 'Approved', target: 'Aproved', doneLabel: 'Approved' },
      { label: 'Profile-Only', target: 'Aproved-Profile Only', doneLabel: 'Approved (Profile Only)' },
    ],
  },
  {
    id: 'approved',
    title: 'Approved',
    statuses: ['Aproved', 'Approved'],
    dot: 'bg-emerald-400',
    emptyMessage: 'No approved tasks.',
  },
  {
    id: 'profileOnly',
    title: 'Approved - Profile Only',
    statuses: ['Aproved-Profile Only', 'Approved-Profile Only'],
    dot: 'bg-teal-400',
    emptyMessage: 'No profile-only tasks.',
  },
  {
    id: 'reject',
    title: 'Reject',
    statuses: ['Reject', 'reject'],
    dot: 'bg-rose-400',
    emptyMessage: 'No rejected tasks.',
  },
];

export interface StatusCardConfig {
  label: string;
  statuses: string[];
  Icon: LucideIcon;
  chip: string;
}

export const STATUS_CARDS: StatusCardConfig[] = [
  { label: 'Draft', statuses: ['Draft', 'draft'], Icon: FileText, chip: 'bg-[#6b7280]/25' },
  { label: 'Not Started', statuses: ['Not Started', 'Not started'], Icon: FileClock, chip: 'bg-[#6646B1]/25' },
  { label: 'In Progress', statuses: ['In Progress', 'In progress'], Icon: Loader2, chip: 'bg-[#3B7BFF]/25' },
  { label: 'QA', statuses: ['QA', 'qa', 'Q&A', 'q&a', 'In QA', 'in qa', 'QA Process', 'Quality Assurance', 'Testing/QA', 'QA/Testing'], Icon: Hourglass, chip: 'bg-[#3B7BFF]/25' },
  { label: 'In Review', statuses: ['In Review', 'In review'], Icon: FileCheck2, chip: 'bg-[#F0A848]/25' },
  { label: 'Approved', statuses: ['Aproved', 'Approved'], Icon: CheckCircle2, chip: 'bg-[#22C35D]/25' },
  { label: 'Profile Only', statuses: ['Aproved-Profile Only', 'Approved-Profile Only'], Icon: UserCheck, chip: 'bg-[#EC4899]/25' },
  { label: 'Rejected', statuses: ['Reject', 'reject'], Icon: XCircle, chip: 'bg-[#E05C5E]/25' },
];

export const IND_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const IND_MONTH_IDX: Record<string, number> = Object.fromEntries(
  IND_MONTHS.map((m, i) => [m, i]),
);

export function monthSortKey(m: string): string {
  const [name, year] = m.split('-');
  return `${year}-${String(IND_MONTH_IDX[name] ?? 0).padStart(2, '0')}`;
}

export function currentTaskMonth(): string {
  const now = new Date();
  return `${IND_MONTHS[now.getMonth()]}-${now.getFullYear()}`;
}
