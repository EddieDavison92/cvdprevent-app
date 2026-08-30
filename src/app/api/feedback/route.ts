import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/resend';

const FEEDBACK_TYPES = new Set(['Idea', 'Problem', 'Data question', 'Other']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FeedbackBody = {
  type?: unknown;
  message?: unknown;
  email?: unknown;
  website?: unknown;
  pageUrl?: unknown;
};

function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 20_000) {
    return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  }

  let body: FeedbackBody;
  try {
    body = await request.json() as FeedbackBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (textValue(body.website)) {
    return NextResponse.json({ ok: true });
  }

  const type = textValue(body.type);
  const message = textValue(body.message);
  const email = textValue(body.email);
  const pageUrl = textValue(body.pageUrl);

  if (!FEEDBACK_TYPES.has(type) || message.length < 10 || message.length > 3000) {
    return NextResponse.json({ error: 'Check the feedback fields' }, { status: 400 });
  }

  if (email && (email.length > 254 || !EMAIL_PATTERN.test(email))) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  if (pageUrl.length > 500 || (pageUrl && !/^https?:\/\//.test(pageUrl))) {
    return NextResponse.json({ error: 'Invalid page URL' }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Feedback email is not configured');
    return NextResponse.json({ error: 'Feedback is unavailable' }, { status: 503 });
  }

  const submittedAt = new Date().toISOString();
  const emailText = [
    `Feedback type: ${type}`,
    '',
    message,
    '',
    `Reply address: ${email || 'Not supplied'}`,
    `Page: ${pageUrl || 'Not supplied'}`,
    `Submitted: ${submittedAt}`,
  ].join('\n');

  try {
    await sendEmail({
      subject: `[CVDPREVENT feedback] ${type}`,
      text: emailText,
      replyTo: email || undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Feedback email failed', error);
    return NextResponse.json({ error: 'Feedback could not be sent' }, { status: 502 });
  }
}
