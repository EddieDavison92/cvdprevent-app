'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, LayoutDashboard, BarChart3, Bot, List, Search } from 'lucide-react';
import { CommandSearch } from './command-search';
import { useOrganisation } from '@/providers/organisation-context';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { clearOrganisation } = useOrganisation();

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-nhs-dark-blue pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-2 sm:px-4 md:px-6">
          <Link
            href="/"
            onClick={() => clearOrganisation()}
            className="flex min-w-0 items-center gap-2 sm:gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Heart className="h-5 w-5 text-white" fill="currentColor" aria-hidden />
            </div>
            <div className="min-w-0">
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                CVD<span className="font-normal opacity-80">PREVENT</span>
              </span>
            </div>
          </Link>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search organisations, indicators, and pages"
            className="hidden h-9 min-w-[280px] items-center gap-2.5 rounded-lg border border-white/15 bg-white/10 px-3 text-sm text-white/70 transition-colors hover:border-white/25 hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:flex md:min-w-[360px]"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span>Search organisations, indicators…</span>
            <kbd className="ml-auto inline-flex h-5 items-center rounded border border-white/20 bg-white/5 px-1.5 font-sans text-[11px] text-white/60">
              {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'}K
            </kbd>
          </button>

          <nav className="flex shrink-0 items-center">
            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="inline-flex size-11 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:hidden"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              className="inline-flex size-11 items-center justify-center rounded-lg text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/indicators"
              aria-label="Indicators"
              className="inline-flex size-11 items-center justify-center rounded-lg text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Indicators</span>
            </Link>
            <Link
              href="/benchmarks"
              aria-label="Benchmarks"
              className="inline-flex size-11 items-center justify-center rounded-lg text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Benchmarks</span>
            </Link>
            <Link
              href="/skills"
              aria-label="Ask AI"
              className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:inline-flex"
            >
              <Bot className="h-4 w-4" />
              <span className="hidden xl:inline">Ask AI</span>
            </Link>
          </nav>
        </div>
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
