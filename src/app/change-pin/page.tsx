import { redirect } from 'next/navigation';
import ChangePinForm from '@/components/auth/ChangePinForm';
import { getCurrentUser } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function ChangePinPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4 dark:bg-[#0d0e12]">
      <ChangePinForm forced={user.pinMustChange} />
    </main>
  );
}
