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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-nhs-blue/10">
          <Building2 className="h-6 w-6 text-nhs-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-nhs-dark-blue">{displayName}</h1>
          <p className="text-sm text-gray-500">
            {isEngland ? 'National Overview' : SYSTEM_LEVEL_NAMES[organisation.SystemLevelID]}
          </p>
        </div>
      </div>
      <Link href="/" onClick={() => clearOrganisation()}>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Change Organisation
        </Button>
      </Link>
    </div>
  );
}
