const DEFAULT_RECIPIENT = 'eddie.davison@nhs.net';
const DEFAULT_SENDER = 'CVDPREVENT feedback <onboarding@resend.dev>';

interface SendEmailOptions {
  subject: string;
  text: string;
  replyTo?: string;
  idempotencyKey?: string;
}

export async function sendEmail({ subject, text, replyTo, idempotencyKey }: SendEmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: process.env.FEEDBACK_FROM_EMAIL ?? DEFAULT_SENDER,
      to: [process.env.FEEDBACK_TO_EMAIL ?? DEFAULT_RECIPIENT],
      subject,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
  }
}
