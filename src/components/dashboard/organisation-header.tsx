'use client';

import { Button } from '@/components/ui/button';
import { useOrganisation } from '@/providers/organisation-context';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Building2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export function OrganisationHeader() {
  const { organisation, clearOrganisation, isEngland } = useOrganisation();

  if (!organisation) return null;

  // Clean up display name
  const displayName = organisation.AreaName
    .replace(/^NHS /, '')
    .replace(/ Integrated Care Board$/, '')
    .replace(/ Primary Care Network$/, '');

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-nhs-blue/10">
        <Building2 className="h-5 w-5 text-nhs-blue" />
      </div>
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-nhs-dark-blue sm:text-2xl">{displayName}</h1>
        <p className="text-sm text-gray-500">
          {isEngland ? 'National overview' : SYSTEM_LEVEL_NAMES[organisation.SystemLevelID]}
        </p>
      </div>
      <Link href="/" onClick={() => clearOrganisation()} className="ml-auto sm:hidden">
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Change
        </Button>
      </Link>
    </div>
  );
}
