import { redirect } from 'next/navigation';
import TopBar from '@/components/TopBar';
import MyProfileView from '@/components/profile/MyProfileView';
import { getAccess, landingPath } from '@/lib/access';
import { getMyProfileAction } from '@/app/actions/my-profile';

export const dynamic = 'force-dynamic';

/** Profil milik sendiri (hanya-baca): detail akun + timeline karier. Hanya untuk akun yang terhubung ke profil designer. */
export default async function ProfilePage() {
  const access = await getAccess();
  if (!access.enabled) redirect('/');
  if (!access.user) redirect('/login');
  if (access.user.pinMustChange) redirect('/change-pin');
  if (!access.user.designerId) redirect(await landingPath(access));

  const res = await getMyProfileAction();

  return (
    <div className="min-h-screen bg-white text-[#262626] dark:bg-[#0d0e12] dark:text-[#f4f4f5]">
      <TopBar badgeLabel="PROFIL" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex-1 overflow-x-hidden bg-grid-pattern p-3 sm:p-6 md:ml-56 md:p-8">
          {res.success ? (
            <MyProfileView profile={res.profile} logs={res.logs} showChangePin={!access.readOnly} />
          ) : (
            <p className="text-sm text-rose-500">{res.error}</p>
          )}
        </main>
      </div>
    </div>
  );
}
