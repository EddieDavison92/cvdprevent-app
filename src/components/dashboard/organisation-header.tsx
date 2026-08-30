'use client';

import { useOrganisation } from '@/providers/organisation-context';
import { SYSTEM_LEVEL_NAMES } from '@/lib/constants/geography';
import { Building2 } from 'lucide-react';
import { AreaChangeDialog } from './area-change-dialog';

export function OrganisationHeader() {
  const { organisation, isEngland } = useOrganisation();

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
      <AreaChangeDialog compact className="ml-auto sm:hidden" />
    </div>
  );
}
