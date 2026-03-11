'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, LayoutDashboard, BarChart3, List, Search } from 'lucide-react';
import { CommandSearch } from './command-search';
import { useOrganisation } from '@/providers/organisation-context';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
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
      <header className="sticky top-0 z-50 w-full bg-nhs-dark-blue">
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <button
            onClick={() => { clearOrganisation(); router.push('/'); }}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Heart className="h-5 w-5 text-white" fill="currentColor" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                CVD<span className="font-normal opacity-80">PREVENT</span>
              </span>
            </div>
          </button>

          {/* Search trigger */}
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-lg bg-white/10 px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/15 hover:text-white min-w-[280px] md:min-w-[360px]"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search...</span>
            <kbd className="ml-2 rounded border border-white/20 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
              {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'}K
            </kbd>
          </button>

          <nav className="flex items-center gap-1">
            {/* Mobile search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="sm:hidden flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Search className="h-4 w-4" />
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link
              href="/indicators"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Indicators</span>
            </Link>
            <Link
              href="/benchmarks"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Benchmarks</span>
            </Link>
          </nav>
        </div>
      </header>

      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
