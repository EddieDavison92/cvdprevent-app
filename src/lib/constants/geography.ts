import { SYSTEM_LEVELS } from '@/lib/api/types';

export const SYSTEM_LEVEL_NAMES: Record<number, string> = {
  [SYSTEM_LEVELS.ENGLAND]: 'England',
  [SYSTEM_LEVELS.REGION]: 'Region',
  [SYSTEM_LEVELS.ICB]: 'ICB',
  [SYSTEM_LEVELS.SUB_ICB]: 'Sub-ICB',
  [SYSTEM_LEVELS.PCN]: 'PCN',
  [SYSTEM_LEVELS.PRACTICE]: 'Practice',
};

export const SYSTEM_LEVEL_ORDER = [
  SYSTEM_LEVELS.ENGLAND,
  SYSTEM_LEVELS.REGION,
  SYSTEM_LEVELS.ICB,
  SYSTEM_LEVELS.SUB_ICB,
  SYSTEM_LEVELS.PCN,
] as const;

// Levels that have public data
export const PUBLIC_LEVELS = [
  SYSTEM_LEVELS.ENGLAND,
  SYSTEM_LEVELS.REGION,
  SYSTEM_LEVELS.ICB,
  SYSTEM_LEVELS.SUB_ICB,
  SYSTEM_LEVELS.PCN,
] as const;

// Get the parent level ID
export function getParentLevel(levelId: number): number | null {
  const index = SYSTEM_LEVEL_ORDER.indexOf(levelId as (typeof SYSTEM_LEVEL_ORDER)[number]);
  if (index <= 0) return null;
  return SYSTEM_LEVEL_ORDER[index - 1];
}

// Get child level ID
export function getChildLevel(levelId: number): number | null {
  const index = SYSTEM_LEVEL_ORDER.indexOf(levelId as (typeof SYSTEM_LEVEL_ORDER)[number]);
  if (index < 0 || index >= SYSTEM_LEVEL_ORDER.length - 1) return null;
  return SYSTEM_LEVEL_ORDER[index + 1];
}
