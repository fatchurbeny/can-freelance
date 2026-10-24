import { Suspense } from 'react';
import { requireAccess } from '@/lib/access';
import NotionConfigClient from '@/components/NotionConfigClient';
import { getLatestSyncStatus } from '@/app/actions/sync';

export const dynamic = 'force-dynamic';

export default async function NotionConfigPage() {
  await requireAccess(['integration.manage']);
  const latestSyncLog = await getLatestSyncStatus();
  // NotionConfigClient membaca ?tab= lewat useSearchParams
  return (
    <Suspense>
      <NotionConfigClient initialSyncLog={latestSyncLog} />
    </Suspense>
  );
}
