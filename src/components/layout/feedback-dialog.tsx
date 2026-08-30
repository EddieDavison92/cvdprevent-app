'use client';

import { useState } from 'react';
import { CheckCircle2, MessageSquareText, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const FEEDBACK_TYPES = ['Idea', 'Problem', 'Data question', 'Other'] as const;

type SubmitState = 'idle' | 'sending' | 'sent' | 'error';

export function FeedbackDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]>('Idea');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && submitState === 'sent') {
      setType('Idea');
      setMessage('');
      setEmail('');
      setSubmitState('idle');
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState('sending');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          email,
          website,
          pageUrl: window.location.href,
        }),
      });

      if (!response.ok) throw new Error('Feedback request failed');
      setSubmitState('sent');
    } catch {
      setSubmitState('error');
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-nhs-blue underline hover:text-nhs-dark-blue"
        >
          <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
          Send feedback
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        {submitState === 'sent' ? (
          <div className="p-6 text-center sm:p-7">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-nhs-green" aria-hidden="true" />
            </div>
            <DialogTitle>Feedback sent</DialogTitle>
            <DialogDescription className="mt-2">
              Thanks. Your message has been emailed to Eddie.
            </DialogDescription>
            <Button className="mt-5" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b bg-nhs-pale-grey/35 px-6 py-5">
              <DialogTitle>Send feedback</DialogTitle>
              <DialogDescription className="mt-1.5">
                Report a problem, question the data or suggest an improvement.
              </DialogDescription>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="space-y-1.5">
                <Label htmlFor="feedback-type">What is this about?</Label>
                <select
                  id="feedback-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as (typeof FEEDBACK_TYPES)[number])}
                  className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {FEEDBACK_TYPES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback-message">Message</Label>
                <textarea
                  id="feedback-message"
                  required
                  minLength={10}
                  maxLength={3000}
                  rows={5}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="What happened, or what would make the explorer more useful?"
                  className="w-full resize-y rounded-md border border-input bg-white px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <p className="text-right text-[11px] tabular-nums text-gray-400">{message.length}/3000</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback-email">Your email <span className="font-normal text-gray-400">(optional)</span></Label>
                <Input
                  id="feedback-email"
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="For a reply"
                  autoComplete="email"
                />
              </div>

              <div className="absolute -left-[10000px]" aria-hidden="true">
                <Label htmlFor="feedback-website">Website</Label>
                <Input
                  id="feedback-website"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <p className="text-xs leading-relaxed text-gray-500">
                Your message, optional email address and the current page will be sent by email.
              </p>

              {submitState === 'error' ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  Feedback could not be sent. Please try again later.
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitState === 'sending' || message.trim().length < 10}>
                  <Send aria-hidden="true" />
                  {submitState === 'sending' ? 'Sending…' : 'Send feedback'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
