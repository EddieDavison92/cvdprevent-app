'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CopySkillUrlProps {
  text: string;
  label: string;
  variant?: 'default' | 'outline';
}

async function writeToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

export function CopySkillUrl({ text, label, variant = 'default' }: CopySkillUrlProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await writeToClipboard(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button type="button" onClick={copy} variant={variant} className="w-full sm:w-auto">
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  );
}
