"use client";

import { createContext, useContext } from 'react';
import type { AccessInfo } from '@/lib/permissions';

const EMPTY: AccessInfo = {
  enabled: false,
  permissions: [],
  unitIds: null,
  userName: null,
  userCode: null,
  roleLabels: [],
  unitNames: null,
  canPreview: false,
  hasProfile: false,
  preview: null,
};

const AccessContext = createContext<AccessInfo>(EMPTY);

export function AccessProvider({ value, children }: { value: AccessInfo; children: React.ReactNode }) {
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessInfo {
  return useContext(AccessContext);
}
