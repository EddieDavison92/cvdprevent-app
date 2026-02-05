/**
 * Build a URL preserving key query params (area, condition) from current search params.
 * Use overrides to set or clear specific params.
 */
export function buildUrl(
  pathname: string,
  searchParams: URLSearchParams,
  overrides?: Record<string, string | null>
): string {
  const params = new URLSearchParams();

  // Preserve these params from current URL
  for (const key of ['area', 'condition']) {
    const val = searchParams.get(key);
    if (val) params.set(key, val);
  }

  // Apply overrides
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
