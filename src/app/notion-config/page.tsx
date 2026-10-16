import { requireAccess } from '@/lib/access';
import NotionConfigClient from '@/components/NotionConfigClient';
import { getLatestSyncStatus } from '@/app/actions/sync';

export const dynamic = 'force-dynamic';

export default async function NotionConfigPage() {
  await requireAccess(['integration.manage']);
  const latestSyncLog = await getLatestSyncStatus();
  return <NotionConfigClient initialSyncLog={latestSyncLog} />;
}
