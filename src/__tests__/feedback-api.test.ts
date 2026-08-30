import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/feedback/route';

function feedbackRequest(body: Record<string, unknown>, origin = 'https://cvdprevent-explorer.app') {
  return new Request('https://cvdprevent-explorer.app/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Host: 'cvdprevent-explorer.app',
      Origin: origin,
    },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/feedback', () => {
  it('sends validated feedback through the email API', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('FEEDBACK_TO_EMAIL', 'eddie.davison@nhs.net');

    const sendEmail = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'email_123' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', sendEmail);

    const response = await POST(feedbackRequest({
      type: 'Problem',
      message: 'The comparison label is difficult to understand.',
      email: 'analyst@example.nhs.uk',
      pageUrl: 'https://cvdprevent-explorer.app/dashboard?area=8063',
    }));

    expect(response.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledOnce();

    const [, request] = sendEmail.mock.calls[0] as [string, RequestInit];
    const email = JSON.parse(request.body as string);
    expect(email).toEqual(expect.objectContaining({
      from: 'CVDPREVENT feedback <onboarding@resend.dev>',
      to: ['eddie.davison@nhs.net'],
      subject: '[CVDPREVENT feedback] Problem',
      reply_to: 'analyst@example.nhs.uk',
    }));
    expect(email.text).toContain('The comparison label is difficult to understand.');
  });

  it('rejects an invalid message', async () => {
    const response = await POST(feedbackRequest({
      type: 'Idea',
      message: 'Too short',
    }));

    expect(response.status).toBe(400);
  });

  it('rejects a cross-origin browser request', async () => {
    const response = await POST(feedbackRequest({
      type: 'Idea',
      message: 'This message is long enough to pass validation.',
    }, 'https://example.com'));

    expect(response.status).toBe(403);
  });

  it('silently accepts submissions that fill the spam field', async () => {
    const sendEmail = vi.fn();
    vi.stubGlobal('fetch', sendEmail);

    const response = await POST(feedbackRequest({
      type: 'Idea',
      message: 'This message is long enough to pass validation.',
      website: 'https://spam.example',
    }));

    expect(response.status).toBe(200);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
