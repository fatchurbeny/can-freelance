import TopBar from '@/components/TopBar';
import AssetLibraryClient from '@/components/assets/AssetLibraryClient';
import { requireAccess } from '@/lib/access';
import { canManageAllAssets } from '@/lib/permissions';
import { canvaProductionUnits, loadAssetLibrary, loadAssetSyncSummary } from '@/lib/asset-library';

export const dynamic = 'force-dynamic';

/** Asset Library: katalog aset Canva (preview public view link) untuk dirujuk di Design Brief. */
export default async function AssetsPage() {
  const access = await requireAccess(['asset.view']);
  const canManage = access.allows('asset.manage');
  const manageAll = !access.enabled || canManageAllAssets(access.user);

  const [library, sync, units] = await Promise.all([
    loadAssetLibrary(access.unitIds, { includeArchived: canManage }),
    loadAssetSyncSummary(),
    // Aset Canva hanya untuk production berplatform Canva
    canvaProductionUnits(access.unitIds),
  ]);

  return (
    <div className="min-h-screen bg-white text-[#262626] dark:bg-[#0d0e12] dark:text-[#f4f4f5]">
      <TopBar badgeLabel="ASSET LIBRARY" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex-1 overflow-x-hidden bg-grid-pattern p-3 sm:p-6 md:ml-56 md:p-8">
          <AssetLibraryClient
            categories={library.categories}
            assets={library.assets}
            units={units}
            canManage={canManage}
            manageAll={manageAll}
            manageUnitIds={units.filter((u) => access.allows('asset.manage', u.id)).map((u) => u.id)}
            sync={sync}
          />
        </main>
      </div>
    </div>
  );
}
