import NotionDatabasesClient from '@/components/NotionDatabasesClient';
import { requireAccess } from '@/lib/access';

export const dynamic = 'force-dynamic';

export default async function DatabasesPage() {
  await requireAccess(['integration.manage']);
  return <NotionDatabasesClient />;
}
