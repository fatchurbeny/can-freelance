import { NextResponse } from 'next/server';
import { syncCanvaEmailsAction, getEmailNotificationsAction } from '@/app/actions/email-notification';
import { authorizeApi } from '@/lib/api-auth';

export async function GET(request: Request) {
  const denied = await authorizeApi('emailNotification.view', { request, allowCronSecret: true });
  if (denied) return denied;
  try {
    const result = await syncCanvaEmailsAction();
    const data = await getEmailNotificationsAction();

    return NextResponse.json({
      success: true,
      message: 'Email inbox sync completed successfully',
      syncedCount: result.count || 0,
      totalEmails: data.notifications?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Email sync failed' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const denied = await authorizeApi('emailNotification.view', { request, allowCronSecret: true });
  if (denied) return denied;
  try {
    const result = await syncCanvaEmailsAction();
    const data = await getEmailNotificationsAction();

    return NextResponse.json({
      success: true,
      message: 'Email sync triggered via POST',
      result,
      totalEmails: data.notifications?.length || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to sync emails' },
      { status: 500 }
    );
  }
}

