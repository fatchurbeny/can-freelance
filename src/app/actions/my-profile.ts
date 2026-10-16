'use server';

import prisma from '@/lib/prisma';
import { getAccess } from '@/lib/access';

/**
 * Detail akun milik sendiri (profil designer + statistik + timeline karier), hanya-baca.
 * Selalu berdasarkan akun efektif — tidak menerima id dari client, jadi tak bisa mengintip designer lain.
 * Tidak memuat brand/akun Canva.
 */
export async function getMyProfileAction() {
  try {
    const access = await getAccess();
    const designerId = access.user?.designerId;
    if (!access.enabled || !access.user || !designerId) {
      return { success: false as const, error: 'Akun ini tidak terhubung ke profil designer.' };
    }

    const [designer, logs, rivals] = await Promise.all([
      prisma.designer.findUnique({
        where: { id: designerId },
        include: { tasks: { select: { qtySubmit: true, pages: true, designStatus: { select: { countsAsApproved: true } } } } },
      }),
      prisma.designerCareerLog.findMany({ where: { designerId }, orderBy: { eventDate: 'desc' } }),
      prisma.designer.findMany({
        where: { status: 'Active' },
        select: { id: true, tasks: { where: { designStatus: { countsAsApproved: true } }, select: { id: true } } },
      }),
    ]);
    if (!designer) return { success: false as const, error: 'Profil designer tidak ditemukan.' };

    const approved = designer.tasks.filter((t) => t.designStatus?.countsAsApproved).length;
    const templates = designer.tasks.reduce((n, t) => n + Number(t.qtySubmit || 0), 0);
    const pages = designer.tasks.reduce((n, t) => n + Number(t.qtySubmit || 0) * Number(t.pages || 0), 0);
    const topApproved = Math.max(0, ...rivals.map((r) => r.tasks.length));
    const isLeaderboardWinner = designer.status === 'Active' && approved > 0 && approved >= topApproved;

    return {
      success: true as const,
      profile: JSON.parse(JSON.stringify({
        id: designer.id,
        displayName: designer.displayName,
        role: designer.role,
        status: designer.status,
        contractType: designer.contractType,
        isAgency: designer.isAgency,
        contractStartDate: designer.contractStartDate,
        probationEndDate: designer.probationEndDate,
        promotionDate: designer.promotionDate,
        email: designer.email,
        phone: designer.phone,
        bankName: designer.bankName,
        bankAccount: designer.bankAccount,
        approved,
        templates,
        pages,
        isLeaderboardWinner,
      })),
      logs: JSON.parse(JSON.stringify(logs)),
    };
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memuat profil.' };
  }
}
