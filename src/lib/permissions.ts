/**
 * Role & permission (docs/knowledge/user-role-spec.md).
 * Kode hanya bertanya `can(user, 'permission', productionUnitId?)`; jangan cek nama role langsung.
 */

export type RoleKey =
  | 'admin'
  | 'art_director'
  | 'project_manager'
  | 'finance'
  | 'designer_fulltime'
  | 'designer_freelance'
  | 'viewer';

export type Permission =
  | 'overview.view'
  | 'kanban.view'
  | 'task.create'
  | 'task.edit'
  | 'task.edit.own'
  | 'parameterIssue.view'
  | 'emailNotification.view'
  | 'uploadLink.view'
  | 'dropboxLink.view'
  | 'account.view' // nama brand/akun Canva (privasi: tidak untuk freelance & viewer)
  | 'accountTeam.view'
  | 'rateCard.view'
  | 'rateCard.edit'
  | 'billing.view'
  | 'billing.view.own'
  | 'integration.manage'
  | 'user.manage'
  | 'production.create'
  | 'asset.view' // lihat Asset Library & pakai di Design Brief
  | 'asset.manage'; // tambah/edit/arsip aset & kategori

const ALL: readonly Permission[] = [
  'overview.view', 'kanban.view', 'task.create', 'task.edit', 'task.edit.own',
  'parameterIssue.view', 'emailNotification.view', 'uploadLink.view', 'dropboxLink.view',
  'account.view', 'accountTeam.view', 'rateCard.view', 'rateCard.edit',
  'billing.view', 'billing.view.own', 'integration.manage', 'user.manage', 'production.create',
  'asset.view', 'asset.manage',
];

const MANAGEMENT: readonly Permission[] = [
  'overview.view', 'kanban.view', 'task.create', 'task.edit',
  'parameterIssue.view', 'emailNotification.view', 'uploadLink.view', 'dropboxLink.view',
  'account.view', 'accountTeam.view', 'rateCard.view', 'rateCard.edit',
  'asset.view', 'asset.manage',
];

export const ROLE_LABELS: Record<RoleKey, string> = {
  admin: 'Admin',
  art_director: 'Art Director',
  project_manager: 'Project Manager',
  finance: 'Finance',
  designer_fulltime: 'Designer Full-time',
  designer_freelance: 'Designer Freelance',
  viewer: 'Viewer',
};

export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  admin: ALL,
  art_director: MANAGEMENT,
  project_manager: MANAGEMENT,
  finance: [
    'overview.view', 'kanban.view', 'account.view', 'rateCard.view', 'billing.view', 'asset.view',
  ],
  designer_fulltime: [
    'kanban.view', 'task.edit.own', 'uploadLink.view', 'account.view', 'billing.view.own', 'asset.view',
  ],
  designer_freelance: [
    'kanban.view', 'task.edit.own', 'uploadLink.view', 'billing.view.own', 'asset.view',
  ],
  viewer: ['overview.view', 'kanban.view', 'asset.view'],
};

export const ROLE_KEYS = Object.keys(ROLE_PERMISSIONS) as RoleKey[];

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as string[]).includes(value);
}

export interface AuthMembership {
  roleKey: string;
  productionUnitId: string | null;
}

export interface AuthUser {
  id: string;
  name: string | null;
  userCode: string | null;
  employmentType: string | null;
  designerId: string | null;
  pinMustChange: boolean;
  memberships: AuthMembership[];
}

/**
 * `productionUnitId` diisi → cek di production itu (membership global ikut berlaku).
 * Dikosongkan → true bila ada membership mana pun yang memiliki permission.
 */
export function can(user: AuthUser | null | undefined, permission: Permission, productionUnitId?: string | null): boolean {
  if (!user) return false;
  return user.memberships.some((m) => {
    if (!isRoleKey(m.roleKey)) return false;
    if (productionUnitId && m.productionUnitId && m.productionUnitId !== productionUnitId) return false;
    return ROLE_PERMISSIONS[m.roleKey].includes(permission);
  });
}

/** Production yang boleh diakses user; `null` = semua (membership global). */
export function accessibleProductionUnitIds(user: AuthUser | null | undefined): string[] | null {
  if (!user) return [];
  if (user.memberships.some((m) => m.productionUnitId === null)) return null;
  return Array.from(new Set(user.memberships.map((m) => m.productionUnitId as string)));
}

/** Menu sidebar -> permission yang membukanya (salah satu cukup). */
export const NAV_REQUIREMENTS: Record<string, Permission[]> = {
  '/': ['overview.view'],
  '/production': ['kanban.view'],
  '/account-team': ['accountTeam.view'],
  '/rate-card': ['rateCard.view'],
  '/assets': ['asset.view'],
  '/billing-statement': ['billing.view', 'billing.view.own'],
  '/knowledge-graph': ['integration.manage'],
  '/notion-config': ['integration.manage'],
  '/user-role': ['user.manage'],
};

/** Ringkasan akses yang aman dikirim ke client (sidebar, penyembunyian tombol). */
export interface AccessInfo {
  enabled: boolean;
  permissions: Permission[];
  /** null = semua production */
  unitIds: string[] | null;
  userName: string | null;
  userCode: string | null;
  roleLabels: string[];
  /** null = semua production */
  unitNames: string[] | null;
  /** Admin (user.manage) boleh memakai "Lihat sebagai". */
  canPreview: boolean;
  /** Akun efektif terhubung ke profil designer (boleh membuka "Profil Saya"). */
  hasProfile: boolean;
  /** Terisi saat Admin sedang melihat sebagai akun lain (hanya-baca). */
  preview: { userCode: string | null; name: string | null; roleLabels: string[] } | null;
}

export function effectivePermissions(user: AuthUser | null | undefined): Permission[] {
  if (!user) return [];
  const set = new Set<Permission>();
  for (const m of user.memberships) {
    if (isRoleKey(m.roleKey)) ROLE_PERMISSIONS[m.roleKey].forEach((p) => set.add(p));
  }
  return Array.from(set);
}

/** Cakupan keanggotaan yang diizinkan per role: global (semua production), unit (per production), both. */
export const ROLE_SCOPE: Record<RoleKey, 'global' | 'unit' | 'both'> = {
  admin: 'global',
  finance: 'both',
  art_director: 'unit',
  project_manager: 'unit',
  designer_fulltime: 'unit',
  designer_freelance: 'unit',
  viewer: 'unit',
};

export const DESIGNER_ROLES: readonly RoleKey[] = ['designer_fulltime', 'designer_freelance'];

export type FeatureLevel = 'full' | 'limited' | 'none';

export interface FeatureRow {
  label: string;
  level: (role: RoleKey, perms: ReadonlySet<Permission>) => FeatureLevel;
}

const has = (perms: ReadonlySet<Permission>, p: Permission) => perms.has(p);

/** Baris matriks menu & fitur per role — dihitung dari ROLE_PERMISSIONS agar selalu sinkron dengan kode. */
export const FEATURE_MATRIX: FeatureRow[] = [
  { label: 'Overview (dashboard agregat)', level: (_r, p) => (has(p, 'overview.view') ? 'full' : 'none') },
  {
    label: 'Production › Kanban',
    level: (_r, p) => (has(p, 'task.edit.own') && !has(p, 'task.edit') ? 'limited' : has(p, 'kanban.view') ? 'full' : 'none'),
  },
  { label: 'Production › Parameter Issue', level: (_r, p) => (has(p, 'parameterIssue.view') ? 'full' : 'none') },
  { label: 'Production › Email Notification', level: (_r, p) => (has(p, 'emailNotification.view') ? 'full' : 'none') },
  { label: 'Brand / Akun Canva (task, kartu, filter)', level: (_r, p) => (has(p, 'account.view') ? 'full' : 'none') },
  { label: 'Detail task › Lihat & Copy Design Brief', level: (_r, p) => (has(p, 'kanban.view') ? 'full' : 'none') },
  { label: 'Detail task › EDIT Design Brief', level: (_r, p) => (has(p, 'task.edit') ? 'full' : 'none') },
  {
    label: 'Detail task › Ubah status & field task',
    level: (_r, p) => (has(p, 'task.edit') ? 'full' : has(p, 'task.edit.own') ? 'limited' : 'none'),
  },
  { label: 'Buat / duplikat / hapus task', level: (_r, p) => (has(p, 'task.create') ? 'full' : 'none') },
  { label: 'Detail task › Upload Link', level: (_r, p) => (has(p, 'uploadLink.view') ? 'full' : 'none') },
  { label: 'Detail task › Dropbox Link (view)', level: (_r, p) => (has(p, 'dropboxLink.view') ? 'full' : 'none') },
  {
    label: 'Billing Statement',
    level: (_r, p) => (has(p, 'billing.view') ? 'full' : has(p, 'billing.view.own') ? 'limited' : 'none'),
  },
  {
    label: 'Rate Card',
    level: (_r, p) => (has(p, 'rateCard.edit') ? 'full' : has(p, 'rateCard.view') ? 'limited' : 'none'),
  },
  { label: 'Account & Team', level: (_r, p) => (has(p, 'accountTeam.view') ? 'full' : 'none') },
  { label: 'Profil Saya + Timeline Karir (menu Profil)', level: (r) => (DESIGNER_ROLES.includes(r) ? 'full' : 'none') },
  {
    label: 'Asset Library',
    level: (_r, p) => (has(p, 'asset.manage') ? 'full' : has(p, 'asset.view') ? 'limited' : 'none'),
  },
  { label: 'Notion Config / Integrasi', level: (_r, p) => (has(p, 'integration.manage') ? 'full' : 'none') },
  { label: 'User & Role · Buat Akun Login', level: (_r, p) => (has(p, 'user.manage') ? 'full' : 'none') },
  { label: 'Lihat sebagai (pratinjau hanya-baca)', level: (_r, p) => (has(p, 'user.manage') ? 'full' : 'none') },
];
