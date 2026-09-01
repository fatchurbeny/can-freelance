import NotionConfigClient from '@/components/NotionConfigClient';
import { getLatestSyncStatus } from '@/app/actions/sync';

export const dynamic = 'force-dynamic';

export default async function NotionConfigPage() {
  const latestSyncLog = await getLatestSyncStatus();
  return <NotionConfigClient initialSyncLog={latestSyncLog} />;
}
