'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '../../../generated/prisma';
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
  subjectTrigger?: string;
}) {
  try {
    const andClauses: any[] = [];

    if (filters?.status && filters.status !== 'ALL') {
      if (filters.status.startsWith('TRIGGER:')) {
        const triggerSubject = filters.status.replace(/^TRIGGER:/, '').trim();
        const norm1 = triggerSubject.replace(/[\u2018\u2019]/g, "'");
        const norm2 = triggerSubject.replace(/[\u2018\u2019']/g, "’");
        andClauses.push({
          OR: [
            { subject: { contains: triggerSubject, mode: 'insensitive' } },
            { subject: { contains: norm1, mode: 'insensitive' } },
            { subject: { contains: norm2, mode: 'insensitive' } },
          ],
        });
      } else if (filters.status === 'UNRESOLVED') {
        andClauses.push({
          OR: [
            { status: 'UNRESOLVED' },
            { subject: { contains: 'not been added', mode: 'insensitive' } },
            { subject: { contains: 'not added', mode: 'insensitive' } },
            { subject: { contains: 'canva library', mode: 'insensitive' } },
            { subject: { contains: 'added to', mode: 'insensitive' } },
          ],
        });
      } else {
        andClauses.push({ status: filters.status });
      }
    }

    if (filters?.subjectTrigger && filters.subjectTrigger !== 'ALL') {
      const triggerSubject = filters.subjectTrigger.trim();
      const norm1 = triggerSubject.replace(/[\u2018\u2019]/g, "'");
      const norm2 = triggerSubject.replace(/[\u2018\u2019']/g, "’");
      andClauses.push({
        OR: [
          { subject: { contains: triggerSubject, mode: 'insensitive' } },
          { subject: { contains: norm1, mode: 'insensitive' } },
          { subject: { contains: norm2, mode: 'insensitive' } },
        ],
      });
    }

    if (filters?.brandName && filters.brandName !== 'ALL') {
      if (filters.brandName === 'OTHER' || filters.brandName === 'Other Brands') {
        const registeredAccounts = await prisma.account.findMany({ select: { displayName: true } });
        const regNames = registeredAccounts.map((a) => a.displayName);
        const allVariants = new Set<string>();
        for (const name of regNames) {
          allVariants.add(name);
          allVariants.add(name.toLowerCase());
          allVariants.add(name.toUpperCase());
        }
        allVariants.add('Impro Studio');
        allVariants.add('impro studio');
        allVariants.add('IMPRO STUDIO');
        allVariants.add('UICreative');
        allVariants.add('uicreative');
        allVariants.add('Ui Creative');

        andClauses.push({
          accountId: null,
          brandName: {
            notIn: Array.from(allVariants),
          },
        });
      } else if (filters.brandName.toLowerCase().includes('impro')) {
        andClauses.push({
          OR: [
            { brandName: { contains: 'impro', mode: 'insensitive' } },
            { account: { displayName: { contains: 'impro', mode: 'insensitive' } } },
          ],
        });
      } else {
        andClauses.push({
          OR: [
            { brandName: { equals: filters.brandName, mode: 'insensitive' } },
            { account: { displayName: { equals: filters.brandName, mode: 'insensitive' } } },
          ],
        });
      }
    }

    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      andClauses.push({
        OR: [
          { subject: { contains: q, mode: 'insensitive' } },
          { brandName: { contains: q, mode: 'insensitive' } },
          { templateTitle: { contains: q, mode: 'insensitive' } },
          { rawBody: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    const where = andClauses.length > 0 ? { AND: andClauses } : {};

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

    try {
      const refreshToken = decryptEmailToken(config.encryptedOAuthToken, config.iv);
      if (refreshToken) {
        await fetch('https://oauth2.googleapis.com/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: refreshToken }),
        });
      }
    } catch (err) {
      console.warn('Google token revoke warning:', err);
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

    // 0. Fetch active sync subject triggers
    let triggerSubjects: string[] = [];
    try {
      const activeTriggers = await prisma.syncSubjectTrigger.findMany({
        where: { isActive: true },
        select: { subject: true },
      });
      triggerSubjects = activeTriggers.map((t) => t.subject);
    } catch (e) {
      console.warn('Failed fetching sync subject triggers in sync:', e);
    }

    // 1. Attempt live sync if config has credentials
    if (config && config.email && (config.encryptedPassword || config.encryptedOAuthToken)) {
      try {
        let fetchedEmails: any[] = [];
        if (config.provider === 'GMAIL_OAUTH' && config.encryptedOAuthToken) {
          const origin = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3002';
          const refreshToken = decryptEmailToken(config.encryptedOAuthToken, config.iv);
          if (!refreshToken) throw Object.assign(new Error('Reconnect required.'), { code: 'invalid_grant' });
          const accessToken = await refreshGoogleAccessToken(refreshToken, origin);
          fetchedEmails = await fetchCanvaEmailsFromGmailApi(accessToken, accounts, triggerSubjects);
        } else {
          fetchedEmails = await fetchCanvaEmailsFromImap(
            {
              host: config.imapHost || 'imap.gmail.com',
              port: config.imapPort || 993,
              email: config.email,
              password: config.encryptedPassword || undefined,
            },
            accounts,
            triggerSubjects
          );
        }

        for (const item of fetchedEmails) {
          let effectiveBrandName = item.brandName;
          if (effectiveBrandName && /impro/i.test(effectiveBrandName)) {
            effectiveBrandName = 'Improstd';
          } else if (effectiveBrandName && /uicreative/i.test(effectiveBrandName)) {
            effectiveBrandName = 'UICreative.net';
          }

          const brandKey = effectiveBrandName?.toLowerCase() || '';
          let matchedAccountId = accountMap.get(brandKey) || null;
          if (!matchedAccountId) {
            if (brandKey.includes('impro')) {
              const improAcc = accounts.find((a) => a.displayName.toLowerCase().includes('impro'));
              if (improAcc) matchedAccountId = improAcc.id;
            } else if (brandKey.includes('uicreative') || brandKey.includes('ui creative')) {
              const uiAcc = accounts.find((a) => a.displayName.toLowerCase().includes('uicreative'));
              if (uiAcc) matchedAccountId = uiAcc.id;
            }
          }

          const isLibraryPublished = /added to (?:the )?canva library|published to library/i.test(item.subject || '');
          const isRejected = /not (?:been )?added|rejected/i.test(item.subject || '');
          const isReadOnly = isLibraryPublished || isRejected;
          const initialStatus = isReadOnly ? 'RESOLVED' : 'UNRESOLVED';

          await prisma.canvaEmailNotification.upsert({
            where: { messageId: item.messageId },
            update: {
              subject: item.subject,
              sender: item.sender,
              recipient: item.recipient,
              receivedAt: item.receivedAt,
              brandName: effectiveBrandName,
              accountId: matchedAccountId,
              templateTitle: item.templateTitle,
              templateUrl: item.templateUrl,
              issueMessages: item.issueMessages,
              rawBody: item.rawBody,
              ...(isReadOnly ? { status: 'RESOLVED' } : {}),
            },
            create: {
              messageId: item.messageId,
              subject: item.subject,
              sender: item.sender,
              recipient: item.recipient,
              receivedAt: item.receivedAt,
              brandName: effectiveBrandName,
              accountId: matchedAccountId,
              templateTitle: item.templateTitle,
              templateUrl: item.templateUrl,
              issueMessages: item.issueMessages,
              rawBody: item.rawBody,
              status: initialStatus,
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

export async function getSyncSubjectTriggersAction() {
  try {
    const triggerModel = (prisma as any).syncSubjectTrigger;
    let triggers: any[] = [];

    if (triggerModel) {
      triggers = await triggerModel.findMany({
        orderBy: { createdAt: 'asc' },
      });

      if (triggers.length === 0) {
        const defaults = [
          {
            subject: "We've found some issues with your template",
            isActive: true,
            description: 'Subjek isu/revisi template Canva',
          },
          {
            subject: 'Your template has not been added to Canva',
            isActive: true,
            description: 'Subjek template ditolak Canva',
          },
          {
            subject: 'Your template has been added to the Canva library!',
            isActive: true,
            description: 'Subjek template berhasil terbit di Canva library',
          },
          {
            subject: 'issues with your template',
            isActive: true,
            description: 'Keyword ringkas isu template Canva',
          },
        ];

        for (const d of defaults) {
          await triggerModel.create({ data: d });
        }

        triggers = await triggerModel.findMany({
          orderBy: { createdAt: 'asc' },
        });
      }
    } else {
      let rawRows: any[] = await prisma.$queryRaw`
        SELECT "id", "subject", "is_active" as "isActive", "description", "created_at" as "createdAt", "updated_at" as "updatedAt"
        FROM "sync_subject_triggers"
        ORDER BY "created_at" ASC
      `;

      if (rawRows.length === 0) {
        const defaults = [
          "We've found some issues with your template",
          'Your template has not been added to Canva',
          'Your template has been added to the Canva library!',
          'issues with your template',
        ];
        for (const s of defaults) {
          await prisma.$executeRaw`
            INSERT INTO "sync_subject_triggers" ("id", "subject", "is_active", "description", "updated_at")
            VALUES (gen_random_uuid(), ${s}, true, null, NOW())
            ON CONFLICT ("subject") DO NOTHING
          `;
        }
        rawRows = await prisma.$queryRaw`
          SELECT "id", "subject", "is_active" as "isActive", "description", "created_at" as "createdAt", "updated_at" as "updatedAt"
          FROM "sync_subject_triggers"
          ORDER BY "created_at" ASC
        `;
      }
      triggers = rawRows;
    }

    return {
      success: true,
      triggers: JSON.parse(JSON.stringify(triggers)),
    };
  } catch (error: any) {
    console.error('Error fetching sync subject triggers:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch sync subject triggers',
      triggers: [],
    };
  }
}

export async function saveSyncSubjectTriggersAction(
  items: Array<{
    id?: string;
    subject: string;
    isActive: boolean;
    description?: string | null;
  }>
) {
  try {
    const validItems = items.filter((item) => item.subject && item.subject.trim());
    if (validItems.length === 0) {
      return { success: false, error: 'Minimal harus ada 1 subject trigger.' };
    }

    const triggerModel = (prisma as any).syncSubjectTrigger;

    if (triggerModel) {
      const preservedIds: string[] = [];

      for (const item of validItems) {
        const trimmedSubject = item.subject.trim();
        if (item.id && item.id.length > 20) {
          const updated = await triggerModel.update({
            where: { id: item.id },
            data: {
              subject: trimmedSubject,
              isActive: item.isActive,
              description: item.description?.trim() || null,
            },
          });
          preservedIds.push(updated.id);
        } else {
          const created = await triggerModel.upsert({
            where: { subject: trimmedSubject },
            update: {
              isActive: item.isActive,
              description: item.description?.trim() || null,
            },
            create: {
              subject: trimmedSubject,
              isActive: item.isActive,
              description: item.description?.trim() || null,
            },
          });
          preservedIds.push(created.id);
        }
      }

      // Remove deleted triggers
      await triggerModel.deleteMany({
        where: {
          id: { notIn: preservedIds },
        },
      });

      try { revalidatePath('/production'); } catch (_) {}

      const allTriggers = await triggerModel.findMany({
        orderBy: { createdAt: 'asc' },
      });

      return {
        success: true,
        triggers: JSON.parse(JSON.stringify(allTriggers)),
      };
    } else {
      // Robust raw SQL fallback if PrismaClient in dev server has not been reloaded
      for (const item of validItems) {
        const trimmedSubject = item.subject.trim();
        await prisma.$executeRaw`
          INSERT INTO "sync_subject_triggers" ("id", "subject", "is_active", "description", "updated_at")
          VALUES (gen_random_uuid(), ${trimmedSubject}, ${item.isActive}, ${item.description?.trim() || null}, NOW())
          ON CONFLICT ("subject") DO UPDATE
          SET "is_active" = EXCLUDED."is_active",
              "description" = EXCLUDED."description",
              "updated_at" = NOW()
        `;
      }

      const subjects = validItems.map((i) => i.subject.trim());
      await prisma.$executeRaw`
        DELETE FROM "sync_subject_triggers"
        WHERE "subject" NOT IN (${Prisma.join(subjects)})
      `;

      try { revalidatePath('/production'); } catch (_) {}

      const allTriggers: any[] = await prisma.$queryRaw`
        SELECT "id", "subject", "is_active" as "isActive", "description", "created_at" as "createdAt", "updated_at" as "updatedAt"
        FROM "sync_subject_triggers"
        ORDER BY "created_at" ASC
      `;

      return {
        success: true,
        triggers: JSON.parse(JSON.stringify(allTriggers)),
      };
    }
  } catch (error: any) {
    console.error('Error saving sync subject triggers:', error);
    return {
      success: false,
      error: error.message || 'Failed to save sync subject triggers',
    };
  }
}



