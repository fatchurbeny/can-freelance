import { NextResponse } from 'next/server';
import { syncCanvaEmailsAction, getEmailNotificationsAction } from '@/app/actions/email-notification';

export async function GET() {
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

export async function POST() {
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

