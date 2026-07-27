'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function assignPayrollMonthAction(
  taskId: string,
  payrollMonth: string
) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { payrollMonth },
    });

    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to assign payroll month.',
    };
  }
}

export async function batchAssignPayrollMonthAction(
  taskIds: string[],
  payrollMonth: string
) {
  try {
    await prisma.task.updateMany({
      where: { id: { in: taskIds } },
      data: { payrollMonth },
    });

    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to batch assign payroll months.',
    };
  }
}
