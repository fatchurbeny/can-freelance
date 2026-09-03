'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateDesignerStatusAction(
  designerId: string,
  status: string,
  details?: {
    inactiveStartDate?: string | null;
    inactiveNote?: string | null;
    resignDate?: string | null;
  }
) {
  try {
    const validStatuses = ['Active', 'Inactive', 'Resign'];
    if (!validStatuses.includes(status)) {
      return { success: false, error: 'Invalid status' };
    }

    const dataToUpdate: any = { status };
    if (status === 'Inactive') {
      dataToUpdate.inactiveStartDate = details?.inactiveStartDate ? new Date(details.inactiveStartDate) : new Date();
      dataToUpdate.inactiveNote = details?.inactiveNote?.trim() || null;
    } else if (status === 'Resign') {
      dataToUpdate.resignDate = details?.resignDate ? new Date(details.resignDate) : new Date();
      dataToUpdate.inactiveNote = details?.inactiveNote?.trim() || null;
    }

    await prisma.designer.update({
      where: { id: designerId },
      data: dataToUpdate,
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update designer status.' };
  }
}

export async function createDesignerAction({
  displayName,
  status = 'Active',
  role = 'Junior Designer',
  contractType = 'Freelance',
  contractStartDate,
  probationEndDate,
  inactiveStartDate,
  inactiveNote,
  resignDate,
  email,
  phone,
  bankName,
  bankAccount,
}: {
  displayName: string;
  status?: string;
  role?: string;
  contractType?: string;
  contractStartDate?: string | null;
  probationEndDate?: string | null;
  inactiveStartDate?: string | null;
  inactiveNote?: string | null;
  resignDate?: string | null;
  email?: string | null;
  phone?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
}) {
  try {
    const name = displayName.trim();
    if (!name) {
      return { success: false, error: 'Designer name is required.' };
    }

    const validStatuses = ['Active', 'Inactive', 'Resign'];
    const finalStatus = validStatuses.includes(status) ? status : 'Active';

    // Generate unique notionKey
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const notionKey = `custom_designer_${Date.now()}_${slug}`;

    const avatarColors = ['#10B981', '#6366F1', '#EC4899', '#3B82F6', '#F59E0B', '#8B5CF6'];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    const newDesigner = await prisma.designer.create({
      data: {
        notionKey,
        displayName: name,
        avatarColor: randomColor,
        status: finalStatus,
        role: role?.trim() || 'Junior Designer',
        contractType: contractType || 'Freelance',
        contractStartDate: contractStartDate ? new Date(contractStartDate) : new Date(),
        probationEndDate: contractType === 'Probation' && probationEndDate ? new Date(probationEndDate) : null,
        inactiveStartDate: finalStatus === 'Inactive' && inactiveStartDate ? new Date(inactiveStartDate) : finalStatus === 'Inactive' ? new Date() : null,
        inactiveNote: finalStatus === 'Inactive' ? inactiveNote?.trim() || null : null,
        resignDate: finalStatus === 'Resign' && resignDate ? new Date(resignDate) : finalStatus === 'Resign' ? new Date() : null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        bankName: bankName?.trim() || null,
        bankAccount: bankAccount?.trim() || null,
      },
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    revalidatePath('/production');

    return { success: true, designer: JSON.parse(JSON.stringify(newDesigner)) };
  } catch (error: any) {
    console.error('Failed to create designer:', error);
    return { success: false, error: error.message || 'Failed to create designer.' };
  }
}

export async function promoteDesignerAction({
  designerId,
  newRole,
  promotionDate,
}: {
  designerId: string;
  newRole: string;
  promotionDate?: string | null;
}) {
  try {
    const roleTitle = newRole.trim();
    if (!roleTitle) {
      return { success: false, error: 'New role title is required.' };
    }

    const updatedDesigner = await prisma.designer.update({
      where: { id: designerId },
      data: {
        role: roleTitle,
        promotionDate: promotionDate ? new Date(promotionDate) : new Date(),
      },
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    return { success: true, designer: JSON.parse(JSON.stringify(updatedDesigner)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to promote designer.' };
  }
}

export async function updateDesignerProfileAction({
  designerId,
  displayName,
  email,
  phone,
  bankName,
  bankAccount,
  contractType,
  contractStartDate,
  probationEndDate,
  role,
}: {
  designerId: string;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  contractType?: string | null;
  contractStartDate?: string | null;
  probationEndDate?: string | null;
  role?: string | null;
}) {
  try {
    const updateData: any = {};
    if (displayName?.trim()) updateData.displayName = displayName.trim();
    if (email !== undefined) updateData.email = email?.trim() || null;
    if (phone !== undefined) updateData.phone = phone?.trim() || null;
    if (bankName !== undefined) updateData.bankName = bankName?.trim() || null;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount?.trim() || null;
    if (contractType) updateData.contractType = contractType;
    if (contractStartDate) updateData.contractStartDate = new Date(contractStartDate);
    if (probationEndDate !== undefined) updateData.probationEndDate = probationEndDate ? new Date(probationEndDate) : null;
    if (role?.trim()) updateData.role = role.trim();

    const updated = await prisma.designer.update({
      where: { id: designerId },
      data: updateData,
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    return { success: true, designer: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update designer profile.' };
  }
}

export async function createAccountAction({
  displayName,
  color,
}: {
  displayName: string;
  color?: string;
}) {
  try {
    const name = displayName.trim();
    if (!name) {
      return { success: false, error: 'Brand account name is required.' };
    }

    // Generate unique notionKey
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const notionKey = `custom_account_${Date.now()}_${slug}`;

    const brandColors = ['#F97316', '#EF4444', '#10B981', '#EC4899', '#8B5CF6', '#3B82F6'];
    const finalColor = color || brandColors[Math.floor(Math.random() * brandColors.length)];

    const newAccount = await prisma.account.create({
      data: {
        notionKey,
        displayName: name,
        color: finalColor,
      },
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    revalidatePath('/production');

    return { success: true, account: JSON.parse(JSON.stringify(newAccount)) };
  } catch (error: any) {
    console.error('Failed to create Canva account/brand:', error);
    return { success: false, error: error.message || 'Failed to create Canva account.' };
  }
}

export async function updateAccountAction({
  accountId,
  displayName,
  color,
}: {
  accountId: string;
  displayName: string;
  color?: string;
}) {
  try {
    const name = displayName.trim();
    if (!name) {
      return { success: false, error: 'Brand account name is required.' };
    }

    const updated = await prisma.account.update({
      where: { id: accountId },
      data: {
        displayName: name,
        ...(color ? { color } : {}),
      },
    });

    revalidatePath('/account-team');
    revalidatePath('/billing-statement');
    return { success: true, account: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update Canva account.' };
  }
}

export async function getDesignerCareerLogsAction(designerId: string) {
  try {
    const logs = await prisma.designerCareerLog.findMany({
      where: { designerId },
      orderBy: { eventDate: 'desc' },
    });
    return { success: true, logs: JSON.parse(JSON.stringify(logs)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch career logs.', logs: [] };
  }
}

export async function addCareerLogAction({
  designerId,
  eventType = 'ACHIEVEMENT',
  title,
  description,
  eventDate,
}: {
  designerId: string;
  eventType?: string;
  title: string;
  description?: string;
  eventDate?: string;
}) {
  try {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      return { success: false, error: 'Title is required for career log.' };
    }

    const newLog = await prisma.designerCareerLog.create({
      data: {
        designerId,
        eventType,
        title: cleanTitle,
        description: description?.trim() || null,
        eventDate: eventDate ? new Date(eventDate) : new Date(),
      },
    });

    revalidatePath('/account-team');
    return { success: true, log: JSON.parse(JSON.stringify(newLog)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add career log.' };
  }
}


