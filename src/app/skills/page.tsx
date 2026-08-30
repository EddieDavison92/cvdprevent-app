import type { Metadata } from 'next';
import Link from 'next/link';
import { Bot } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { CopySkillUrl } from '@/components/skills/copy-skill-url';

const SKILL_URL = 'https://www.cvdprevent-explorer.app/skill.md';
const SKILL_SOURCE_URL = '/skills/cvdprevent/SKILL.md';
const API_REFERENCE_URL = '/api-reference.md';

export const metadata: Metadata = {
  title: 'Use CVDPREVENT data with an AI assistant',
  description: 'Copy one URL and give it to ChatGPT, Claude, or another web-enabled assistant to query public aggregate CVDPREVENT data.',
  alternates: { canonical: '/skills' },
};

export default function SkillsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-nhs-pale-grey/30">
      <Header />

      <main className="flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl space-y-10">
          <header className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-nhs-blue/10">
              <Bot className="h-6 w-6 text-nhs-blue" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-nhs-dark-blue sm:text-3xl">
                Use CVDPREVENT data with an AI assistant
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                Give ChatGPT, Claude, or another assistant that can open web links a short instruction file. It can then find NHS organisations, query the public CVDPREVENT API, and explain comparisons using the right period and indicator direction.
              </p>
            </div>
          </header>

          <section aria-labelledby="copy-heading" className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-nhs-blue">Start here</p>
            <h2 id="copy-heading" className="mt-1 text-lg font-semibold text-nhs-dark-blue">Copy the skill URL</h2>
            <p className="mt-1 text-sm text-gray-600">Paste it into a new chat and ask the assistant to read it.</p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code aria-label="Skill URL" className="min-w-0 flex-1 break-all rounded-lg bg-nhs-pale-grey/50 px-3 py-3 font-mono text-sm text-gray-800">
                {SKILL_URL}
              </code>
              <CopySkillUrl text={SKILL_URL} label="Copy URL" />
            </div>
          </section>

          <section aria-labelledby="questions-heading">
            <h2 id="questions-heading" className="text-lg font-semibold text-nhs-dark-blue">What you can ask</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
              Ask about an NHS organisation, indicator or condition. The assistant can compare areas, identify gaps, explain trends and explore demographic breakdowns. Answers include the reporting period and source links so you can check the figures in the explorer.
            </p>
          </section>

          <section aria-labelledby="data-heading" className="border-t border-gray-200 pt-8">
            <h2 id="data-heading" className="text-lg font-semibold text-nhs-dark-blue">What it uses</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-gray-700 marker:text-nhs-blue">
              <li>Public aggregate data from the CVDPREVENT API, the same source as this explorer.</li>
              <li>Public organisation-level data, including practice data where the API makes it available. It does not provide patient-level records.</li>
              <li>The API needs no login. Your assistant fetches the figures when you ask; its own data controls still apply.</li>
              <li>It is not clinical advice. Check anything you act on against the explorer or official CVDPREVENT site.</li>
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-gray-200 pt-6 text-sm text-gray-600">
            <span>Prefer charts?</span>
            <Link href="/dashboard" className="font-semibold text-nhs-blue hover:underline">Open the dashboard</Link>
            <span aria-hidden="true">·</span>
            <a href={SKILL_SOURCE_URL} className="font-semibold text-nhs-blue hover:underline">View the skill file</a>
            <span aria-hidden="true">·</span>
            <a href={API_REFERENCE_URL} className="font-semibold text-nhs-blue hover:underline">API reference</a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
