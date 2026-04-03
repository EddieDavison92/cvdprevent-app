'use client';

import { useQuery } from '@tanstack/react-query';

const API_BASE = 'https://api.cvdprevent.nhs.uk';
const HEALTH_TIMEOUT_MS = 10_000;

async function checkApiHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_BASE}/timePeriod`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function useApiStatus() {
  const { data: isApiUp, isLoading } = useQuery({
    queryKey: ['api-health'],
    queryFn: checkApiHealth,
    staleTime: 60_000,        // Re-check at most every 60s
    gcTime: 5 * 60_000,
    retry: 1,
    refetchInterval: 120_000, // Poll every 2 min so banner clears when API recovers
    refetchOnWindowFocus: true,
  });

  return {
    isApiDown: isApiUp === false,
    isChecking: isLoading,
  };
}
