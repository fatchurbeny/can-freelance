'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function togglePayrollStatusAction(designerId: string, payrollMonth: string, isPaid: boolean) {
  try {
    await prisma.payrollStatus.upsert({
      where: {
        designerId_payrollMonth: { designerId, payrollMonth },
      },
      create: {
        designerId,
        payrollMonth,
        isPaid,
      },
      update: {
        isPaid,
      },
    });

    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update payroll status.' };
  }
}

export async function getPayrollStatusMap(designerIds: string[], payrollMonth: string) {
  const rows = await prisma.payrollStatus.findMany({
    where: {
      designerId: { in: designerIds },
      payrollMonth,
    },
  });

  return new Map(rows.map((row) => [row.designerId, row.isPaid] as const));
}
