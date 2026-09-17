'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { fetchCanvaEmailsFromImap } from '@/lib/imap-client';
import { fetchCanvaEmailsFromGmailApi } from '@/lib/gmail-client';
import { decryptEmailToken, friendlyGoogleAuthError, refreshGoogleAccessToken } from '@/lib/google-oauth';

export interface CanvaEmailPayload {
  messageId: string;
  subject?: string;
  sender?: string;
  recipient?: string;
  receivedAt?: string | Date;
  brandName?: string;
  templateTitle?: string;
  templateUrl?: string;
  issueMessages?: string[];
  rawBody?: string;
}

export async function getEmailNotificationsAction(filters?: {
  brandName?: string;
  status?: string;
  search?: string;
}) {
  try {
    const where: any = {};

    if (filters?.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    if (filters?.brandName && filters.brandName !== 'ALL') {
      where.brandName = {
        equals: filters.brandName,
        mode: 'insensitive',
      };
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { subject: { contains: q, mode: 'insensitive' } },
        { brandName: { contains: q, mode: 'insensitive' } },
        { templateTitle: { contains: q, mode: 'insensitive' } },
        { rawBody: { contains: q, mode: 'insensitive' } },
      ];
    }

    const notifications = await prisma.canvaEmailNotification.findMany({
      where,
      include: {
        account: true,
      },
      orderBy: { receivedAt: 'desc' },
    });

    return {
      success: true,
      notifications: JSON.parse(JSON.stringify(notifications)),
    };
  } catch (error: any) {
    console.error('Error fetching Canva email notifications:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch email notifications',
      notifications: [],
    };
  }
}

export async function updateEmailNotificationStatusAction(
  id: string,
  status: 'UNRESOLVED' | 'RESOLVED'
) {
  try {
    const updated = await prisma.canvaEmailNotification.update({
      where: { id },
      data: { status },
    });

    try { revalidatePath('/production'); } catch (_) {}
    return { success: true, notification: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to update email notification status',
    };
  }
}

export async function saveEmailConfigAction(data: {
  provider?: string;
  email: string;
  imapHost?: string;
  imapPort?: number;
  password?: string;
  autoSync?: boolean;
}) {
  try {
    const existing = await prisma.emailConfig.findFirst();

    if (existing) {
      const updated = await prisma.emailConfig.update({
        where: { id: existing.id },
        data: {
          provider: data.provider || 'IMAP',
          email: data.email.trim(),
          imapHost: data.imapHost?.trim() || 'imap.gmail.com',
          imapPort: data.imapPort || 993,
          ...(data.password ? { encryptedPassword: data.password } : {}),
          authStatus: 'ACTIVE',
          lastAuthErrorCode: null,
          lastAuthError: null,
          autoSync: data.autoSync ?? true,
        },
      });
      try { revalidatePath('/notion-config'); } catch (_) {}
      return { success: true, config: JSON.parse(JSON.stringify(updated)) };
    } else {
      const created = await prisma.emailConfig.create({
        data: {
          provider: data.provider || 'IMAP',
          email: data.email.trim(),
          imapHost: data.imapHost?.trim() || 'imap.gmail.com',
          imapPort: data.imapPort || 993,
          encryptedPassword: data.password || null,
          authStatus: 'ACTIVE',
          lastAuthErrorCode: null,
          lastAuthError: null,
          autoSync: data.autoSync ?? true,
        },
      });
      try { revalidatePath('/notion-config'); } catch (_) {}
      return { success: true, config: JSON.parse(JSON.stringify(created)) };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to save email configuration.',
    };
  }
}

export async function getEmailConfigAction() {
  try {
    const config = await prisma.emailConfig.findFirst();
    const googleOAuthConfigured = Boolean(
      (process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID) &&
      (process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET)
    );
    return {
      success: true,
      config: config ? JSON.parse(JSON.stringify(config)) : null,
      googleOAuthConfigured,
    };
  } catch (error: any) {
    return { success: false, error: error.message, config: null, googleOAuthConfigured: false };
  }
}

export async function disconnectGoogleEmailAction() {
  try {
    const config = await prisma.emailConfig.findFirst();
    if (!config) return { success: true };

    const refreshToken = decryptEmailToken(config.encryptedOAuthToken, config.iv);
    if (refreshToken) {
      try {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: refreshToken }),
        });
      } catch (err) {
        console.warn('Google token revoke warning:', err);
      }
    }

    const updated = await prisma.emailConfig.update({
      where: { id: config.id },
      data: {
        encryptedOAuthToken: null,
        encryptedPassword: null,
        iv: null,
        authStatus: 'DISCONNECTED',
        lastAuthErrorCode: null,
        lastAuthError: null,
        autoSync: false,
      },
    });
    try { revalidatePath('/notion-config'); revalidatePath('/production'); } catch (_) {}
    return { success: true, config: JSON.parse(JSON.stringify(updated)) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to disconnect Google account.' };
  }
}

export async function clearAllEmailNotificationsAction() {
  try {
    await prisma.canvaEmailNotification.deleteMany({});
    try { revalidatePath('/production'); } catch (_) {}
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function syncCanvaEmailsAction() {
  try {
    let accounts: any[] = [];
    try {
      accounts = await prisma.account.findMany({ select: { id: true, displayName: true } });
    } catch (e) {
      console.warn('Failed fetching accounts in sync:', e);
    }

    let config: any = null;
    try {
      config = await prisma.emailConfig.findFirst();
    } catch (e) {
      console.warn('Failed fetching email config in sync:', e);
    }

    const accountMap = new Map(accounts.map((a) => [a.displayName.toLowerCase(), a.id]));

    // 1. Attempt live sync if config has credentials
    if (config && config.email && (config.encryptedPassword || config.encryptedOAuthToken)) {
      try {
        let fetchedEmails: any[] = [];
        if (config.provider === 'GMAIL_OAUTH' && config.encryptedOAuthToken) {
          const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3002';
          const refreshToken = decryptEmailToken(config.encryptedOAuthToken, config.iv);
          if (!refreshToken) throw Object.assign(new Error('Reconnect required.'), { code: 'invalid_grant' });
          const accessToken = await refreshGoogleAccessToken(refreshToken, origin);
          fetchedEmails = await fetchCanvaEmailsFromGmailApi(accessToken, accounts);
        } else {
          fetchedEmails = await fetchCanvaEmailsFromImap(
            {
              host: config.imapHost || 'imap.gmail.com',
              port: config.imapPort || 993,
              email: config.email,
              password: config.encryptedPassword || undefined,
            },
            accounts
          );
        }

        for (const item of fetchedEmails) {
          const brandKey = item.brandName?.toLowerCase() || '';
          const matchedAccountId = accountMap.get(brandKey) || accounts[0]?.id || null;

          await prisma.canvaEmailNotification.upsert({
            where: { messageId: item.messageId },
            update: {
              subject: item.subject,
              sender: item.sender,
              recipient: item.recipient,
              receivedAt: item.receivedAt,
              brandName: item.brandName,
              accountId: matchedAccountId,
              templateTitle: item.templateTitle,
              templateUrl: item.templateUrl,
              issueMessages: item.issueMessages,
              rawBody: item.rawBody,
            },
            create: {
              messageId: item.messageId,
              subject: item.subject,
              sender: item.sender,
              recipient: item.recipient,
              receivedAt: item.receivedAt,
              brandName: item.brandName,
              accountId: matchedAccountId,
              templateTitle: item.templateTitle,
              templateUrl: item.templateUrl,
              issueMessages: item.issueMessages,
              rawBody: item.rawBody,
              status: 'UNRESOLVED',
            },
          });
        }
        await prisma.emailConfig.update({
          where: { id: config.id },
          data: {
            authStatus: 'ACTIVE',
            lastAuthErrorCode: null,
            lastAuthError: null,
            lastSyncedAt: new Date(),
          },
        });
      } catch (err) {
        console.warn('Live IMAP sync warning:', err);
        const code = (err as any)?.code || 'gmail_fetch_failed';
        await prisma.emailConfig.update({
          where: { id: config.id },
          data: {
            authStatus: code === 'invalid_grant' ? 'RECONNECT_REQUIRED' : 'AUTH_FAILED',
            lastAuthErrorCode: code,
            lastAuthError: (err as any)?.message || friendlyGoogleAuthError(code),
          },
        });
      }
    }

    // 2. Fetch strictly real stored notifications from database
    let notifications: any[] = [];
    try {
      notifications = await prisma.canvaEmailNotification.findMany({
        orderBy: { receivedAt: 'desc' },
        include: { account: true },
      });
    } catch (e) {
      console.warn('Failed fetching notifications:', e);
    }

    try { revalidatePath('/production'); } catch (_) {}
    return {
      success: true,
      count: notifications.length,
      notifications: JSON.parse(JSON.stringify(notifications)),
      email: config?.email || null,
    };
  } catch (error: any) {
    console.error('Error syncing Canva emails:', error);
    return { success: false, error: error.message, notifications: [] };
  }
}



