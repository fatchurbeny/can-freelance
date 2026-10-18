export type RestrictedProductionTab = 'parameterIssue' | 'emailNotification';

export const TAB_ACCESS: Record<RestrictedProductionTab, readonly string[]> = {
  parameterIssue: ['Art Director', 'Project Manager'],
  emailNotification: ['Art Director', 'Project Manager'],
};

export function canAccessProductionTab(tab: string, role?: string | null): boolean {
  const allowed = TAB_ACCESS[tab as RestrictedProductionTab];
  if (!allowed) return true;
  return !!role && allowed.includes(role);
}
