'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateDesignerStatusAction(designerId: string, status: string) {
  try {
    const validStatuses = ['Active', 'Inactive', 'Resign'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Invalid status' };
    }

    await prisma.designer.update({
      where: { id: designerId },
      data: { status },
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update designer status.' };
  }
}
