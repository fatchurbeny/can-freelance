import NotionDatabasesClient from '@/components/NotionDatabasesClient';
import { getLatestSyncStatus } from '@/app/actions/sync';

export const dynamic = 'force-dynamic';

export default async function DatabasesPage() {
  const latestSyncLog = await getLatestSyncStatus();
  return <NotionDatabasesClient initialSyncLog={latestSyncLog} />;
}
