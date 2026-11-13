'use client';

import { useSyncExternalStore } from 'react';

const NARROW_QUERY = '(max-width: 639px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(NARROW_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** True below Tailwind's `sm` breakpoint (640px), where charts need tighter labels. */
export function useIsNarrow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}
