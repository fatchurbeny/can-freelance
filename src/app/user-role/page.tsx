import prisma from '@/lib/prisma';
import TopBar from '@/components/TopBar';
import UserRoleClient from '@/components/user-role/UserRoleClient';
import { requireAccess } from '@/lib/access';
import { loadUserRows } from '@/lib/user-admin';

export const dynamic = 'force-dynamic';

/** Manajemen user & role (khusus Admin): daftar user, tambah/edit, reset PIN, nonaktifkan, matriks hak akses. */
export default async function UserRolePage() {
  const access = await requireAccess(['user.manage']);

  const [users, units, designers] = await Promise.all([
    loadUserRows(),
    prisma.productionUnit.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } }),
    prisma.designer.findMany({
      where: { user: null, status: { not: 'Resign' } },
      orderBy: { displayName: 'asc' },
      select: { id: true, displayName: true, contractType: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-white text-[#262626] dark:bg-[#0d0e12] dark:text-[#f4f4f5]">
      <TopBar badgeLabel="USER & ROLE" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex-1 overflow-x-hidden bg-grid-pattern p-3 sm:p-6 md:ml-56 md:p-8">
          <UserRoleClient
            initialUsers={users}
            units={units}
            freeDesigners={designers}
            meId={access.realUser?.id ?? ''}
          />
        </main>
      </div>
    </div>
  );
}
