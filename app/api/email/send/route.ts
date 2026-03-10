import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/email/send
 * 
 * Send a custom email
 * Body: { to, subject, html, text?, from? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, from } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, html, text, from });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
