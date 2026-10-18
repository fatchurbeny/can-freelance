export type NotionMode = 'create' | 'connect';

export interface PlatformOption {
  id: string;
  name: string;
  slug: string;
  outputType: 'canva_link' | 'dropbox_link' | string;
}

export interface WizardData {
  name: string;
  slug: string;
  platformId: string;
  notionMode: NotionMode;
  parentPageId: string;
  databaseId: string;
  dropboxRoot: string;
}

export const STEP_LABELS = [
  'Info Dasar',
  'Notion Database',
  'Skema Field',
  'Output',
  'Review',
  'Progress',
  'Success',
] as const;

export const STEP = {
  INFO: 0,
  NOTION: 1,
  SCHEMA: 2,
  OUTPUT: 3,
  REVIEW: 4,
  PROGRESS: 5,
  SUCCESS: 6,
} as const;

export const INITIAL_DATA: WizardData = {
  name: '',
  slug: '',
  platformId: '',
  notionMode: 'create',
  parentPageId: '',
  databaseId: '',
  dropboxRoot: '',
};

export function slugifyName(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
