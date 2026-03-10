import { NextRequest, NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/email/test
 * 
 * Send a test welcome email
 * Body: { to, userName }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, userName } = body;

    if (!to || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields: to, userName' },
        { status: 400 }
      );
    }

    const result = await sendWelcomeEmail(to, userName);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully!',
      data: result.data,
    });
  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
